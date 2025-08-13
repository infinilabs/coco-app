pub(crate) mod built_in;
pub(crate) mod third_party;

use crate::common::document::ExtensionOnOpened;
use crate::common::document::ExtensionOnOpenedType;
use crate::common::document::OnOpened;
use crate::common::register::SearchSourceRegistry;
use crate::util::platform::Platform;
use anyhow::Context;
use borrowme::{Borrow, ToOwned};
use derive_more::Display;
use indexmap::IndexMap;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as Json;
use std::collections::HashMap;
use std::collections::HashSet;
use std::path::Path;
use tauri::{AppHandle, Manager};
use third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub const LOCAL_QUERY_SOURCE_TYPE: &str = "local";
const PLUGIN_JSON_FILE_NAME: &str = "plugin.json";
const ASSETS_DIRECTORY_FILE_NAME: &str = "assets";

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
pub struct Extension {
    /// Extension ID.
    ///
    /// The ID doesn't uniquely identifies an extension; Its bundle ID (ID & developer) does.
    id: String,
    /// Extension name.
    name: String,
    /// ID of the developer.
    ///
    /// * For built-in extensions, this will always be None.
    /// * For third-party first-layer extensions, the on-disk plugin.json file
    ///   won't contain this field, but we will set this field for them after reading them into the memory.
    /// * For third-party sub extensions, this field will be None.
    developer: Option<String>,
    /// Platforms supported by this extension.
    ///
    /// If `None`, then this extension can be used on all the platforms.
    #[serde(skip_serializing_if = "Option::is_none")]
    platforms: Option<HashSet<Platform>>,
    /// Extension description.
    description: String,
    //// Specify the icon for this extension,
    ///
    /// For the `plugin.json` file, this field can be specified in multi options:
    ///
    /// 1. It can be a path to the icon file, the path can be
    ///
    ///    * relative (relative to the "assets" directory)
    ///    * absolute
    /// 2. It can be a font class code, e.g., 'font_coco', if you want to use
    ///    Coco's built-in icons.
    ///
    /// In cases where your icon file is named similarly to a font class code, Coco
    /// will treat it as an icon file if it exists, i.e., if file `<extension>/assets/font_coco`
    /// exists, then Coco will use this file rather than the built-in 'font_coco' icon.
    ///
    /// For the `struct Extension` loaded into memory, this field should be:
    ///
    /// 1. An absolute path
    /// 2. A font code
    icon: String,
    r#type: ExtensionType,
    /// If this is a Command extension, then action defines the operation to execute
    /// when the it is triggered.
    #[serde(skip_serializing_if = "Option::is_none")]
    action: Option<CommandAction>,
    /// The link to open if this is a Quicklink extension.
    #[serde(skip_serializing_if = "Option::is_none")]
    quicklink: Option<Quicklink>,

    // If this extension is of type Group or Extension, then it behaves like a
    // directory, i.e., it could contain sub items.
    commands: Option<Vec<Extension>>,
    scripts: Option<Vec<Extension>>,
    quicklinks: Option<Vec<Extension>>,

    /// The alias of the extension.
    ///
    /// Extension of type Group and Extension cannot have alias.
    #[serde(skip_serializing_if = "Option::is_none")]
    alias: Option<String>,
    /// The hotkey of the extension.
    ///
    /// Extension of type Group and Extension cannot have hotkey.
    #[serde(skip_serializing_if = "Option::is_none")]
    hotkey: Option<String>,

    /// Is this extension enabled.
    #[serde(default = "default_true")]
    enabled: bool,

    /// Extension settings
    #[serde(skip_serializing_if = "Option::is_none")]
    settings: Option<ExtensionSettings>,

    // We do not care about these fields, just take it regardless of what it is.
    screenshots: Option<Json>,
    url: Option<Json>,
    version: Option<Json>,
}

/// Bundle ID uniquely identifies an extension.
#[derive(Debug, Deserialize, Serialize, PartialEq, Clone)]
pub(crate) struct ExtensionBundleId {
    developer: Option<String>,
    extension_id: String,
    sub_extension_id: Option<String>,
}

impl Borrow for ExtensionBundleId {
    type Target<'a> = ExtensionBundleIdBorrowed<'a>;

    fn borrow(&self) -> Self::Target<'_> {
        ExtensionBundleIdBorrowed {
            developer: self.developer.as_deref(),
            extension_id: &self.extension_id,
            sub_extension_id: self.sub_extension_id.as_deref(),
        }
    }
}

/// Reference version of `ExtensionBundleId`.
#[derive(Debug, Serialize, PartialEq)]
pub(crate) struct ExtensionBundleIdBorrowed<'ext> {
    developer: Option<&'ext str>,
    extension_id: &'ext str,
    sub_extension_id: Option<&'ext str>,
}

impl ToOwned for ExtensionBundleIdBorrowed<'_> {
    type Owned = ExtensionBundleId;

    fn to_owned(&self) -> Self::Owned {
        ExtensionBundleId {
            developer: self.developer.map(|s| s.to_string()),
            extension_id: self.extension_id.to_string(),
            sub_extension_id: self.sub_extension_id.map(|s| s.to_string()),
        }
    }
}

impl<'ext> PartialEq<ExtensionBundleIdBorrowed<'ext>> for ExtensionBundleId {
    fn eq(&self, other: &ExtensionBundleIdBorrowed<'ext>) -> bool {
        self.developer.as_deref() == other.developer
            && self.extension_id == other.extension_id
            && self.sub_extension_id.as_deref() == other.sub_extension_id
    }
}

impl<'ext> PartialEq<ExtensionBundleId> for ExtensionBundleIdBorrowed<'ext> {
    fn eq(&self, other: &ExtensionBundleId) -> bool {
        self.developer == other.developer.as_deref()
            && self.extension_id == other.extension_id
            && self.sub_extension_id == other.sub_extension_id.as_deref()
    }
}

impl Extension {
    /// Whether this extension could be searched.
    pub(crate) fn searchable(&self) -> bool {
        self.on_opened().is_some()
    }

    /// Return what will happen when we open this extension.
    ///
    /// `None` if it cannot be opened.
    pub(crate) fn on_opened(&self) -> Option<OnOpened> {
        let settings = self.settings.clone();

        match self.r#type {
            // This function, at the time of writing this comment, is primarily
            // used by third-party extensions.
            //
            // Built-in extensions don't use this as they are technically not
            // "struct Extension"s.  Typically, they directly construct a
            // "struct Document" from their own type.
            ExtensionType::Calculator => unreachable!("this is handled by frontend"),
            ExtensionType::AiExtension => unreachable!(
                "currently, all AI extensions we have are non-searchable, so we won't open them"
            ),
            ExtensionType::Application => {
                // We can have a impl like:
                //
                // Some(OnOpened::Application { app_path: self.id.clone() })
                //
                // but it won't be used.

                unreachable!(
                    "Applications are not \"struct Extension\" under the hood, they won't call this method"
                )
            }

            // These 2 types of extensions cannot be opened
            ExtensionType::Group => return None,
            ExtensionType::Extension => return None,

            ExtensionType::Command => {
                let ty = ExtensionOnOpenedType::Command {
                  action: self.action.clone().unwrap_or_else(|| {
                    panic!(
                      "Command extension [{}]'s [action] field is not set, something wrong with your extension validity check", self.id
                    )
                  }),
              };

                let extension_on_opened = ExtensionOnOpened { ty, settings };

                Some(OnOpened::Extension(extension_on_opened))
            }
            ExtensionType::Quicklink => {
                let quicklink = self.quicklink.clone().unwrap_or_else(|| {
                  panic!(
                    "Quicklink extension [{}]'s [quicklink] field is not set, something wrong with your extension validity check", self.id
                  )
                });

                let ty = ExtensionOnOpenedType::Quicklink {
                    link: quicklink.link,
                    open_with: quicklink.open_with,
                };

                let extension_on_opened = ExtensionOnOpened { ty, settings };

                Some(OnOpened::Extension(extension_on_opened))
            }
            ExtensionType::Script => todo!("not supported yet"),
            ExtensionType::Setting => todo!("not supported yet"),
        }
    }

    pub(crate) fn get_sub_extension(&self, sub_extension_id: &str) -> Option<&Self> {
        if !self.r#type.contains_sub_items() {
            return None;
        }

        if let Some(ref commands) = self.commands {
            if let Some(sub_ext) = commands.iter().find(|cmd| cmd.id == sub_extension_id) {
                return Some(sub_ext);
            }
        }
        if let Some(ref scripts) = self.scripts {
            if let Some(sub_ext) = scripts.iter().find(|script| script.id == sub_extension_id) {
                return Some(sub_ext);
            }
        }
        if let Some(ref quicklinks) = self.quicklinks {
            if let Some(sub_ext) = quicklinks.iter().find(|link| link.id == sub_extension_id) {
                return Some(sub_ext);
            }
        }

        None
    }

    pub(crate) fn get_sub_extension_mut(&mut self, sub_extension_id: &str) -> Option<&mut Self> {
        if !self.r#type.contains_sub_items() {
            return None;
        }

        if let Some(ref mut commands) = self.commands {
            if let Some(sub_ext) = commands.iter_mut().find(|cmd| cmd.id == sub_extension_id) {
                return Some(sub_ext);
            }
        }
        if let Some(ref mut scripts) = self.scripts {
            if let Some(sub_ext) = scripts
                .iter_mut()
                .find(|script| script.id == sub_extension_id)
            {
                return Some(sub_ext);
            }
        }
        if let Some(ref mut quicklinks) = self.quicklinks {
            if let Some(sub_ext) = quicklinks
                .iter_mut()
                .find(|link| link.id == sub_extension_id)
            {
                return Some(sub_ext);
            }
        }

        None
    }

    pub(crate) fn supports_alias_hotkey(&self) -> bool {
        let ty = self.r#type;

        ty != ExtensionType::Group && ty != ExtensionType::Extension
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
pub(crate) struct CommandAction {
    pub(crate) exec: String,
    pub(crate) args: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
pub struct Quicklink {
    // NOTE that `struct QuicklinkLink` (not `struct Quicklink`) has its own
    // derived `Deserialize/Serialize` impl, which deserializes/serializes
    // it from/to a JSON object.
    //
    // We cannot use it here because we need to deserialize/serialize it from/to
    // a string,
    //
    // "https://www.google.com/search?q={query}"
    #[serde(deserialize_with = "deserialize_quicklink_link_from_string")]
    #[serde(serialize_with = "serialize_quicklink_link_to_string")]
    link: QuicklinkLink,
    /// Specify the application to use to open this quicklink.
    ///
    /// Only supported on macOS.
    pub(crate) open_with: Option<String>,
}

/// Return name and optional default value of all the dynamic placeholder arguments.
///
/// NOTE that it is not a Rust associated function because we need to expose it
/// to the frontend code:
///
/// ```javascript
/// invoke('quicklink_link_arguments', { <A JSON that can be deserialized to `struct QuicklinkLink`> } )
/// ```
#[tauri::command]
pub(crate) fn quicklink_link_arguments(
    quicklink_link: QuicklinkLink,
) -> IndexMap<String, Option<String>> {
    let mut arguments_with_opt_default = IndexMap::new();

    for component in quicklink_link.components.iter() {
        if let QuicklinkLinkComponent::DynamicPlaceholder {
            argument_name,
            default,
        } = component
        {
            arguments_with_opt_default.insert(argument_name.to_string(), default.as_ref().cloned());
        }
    }

    arguments_with_opt_default
}

/// A quicklink consists of a sequence of components.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) struct QuicklinkLink {
    components: Vec<QuicklinkLinkComponent>,
}

impl QuicklinkLink {
    /// Quicklinks that accept arguments cannot produce a complete URL
    /// without user-supplied arguments.
    ///
    /// This function attempts to concatenate the URL using the provided arguments,
    /// if any.
    pub(crate) fn concatenate_url(
        &self,
        user_supplied_args: &Option<HashMap<String, String>>,
    ) -> String {
        let mut out = String::new();
        for component in self.components.iter() {
            match component {
                QuicklinkLinkComponent::StaticStr(str) => {
                    out.push_str(str.as_str());
                }
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name,
                    default,
                } => {
                    let opt_argument_value = {
                        let user_supplied_arg = user_supplied_args
                            .as_ref()
                            .and_then(|map| map.get(argument_name.as_str()));

                        if user_supplied_arg.is_some() {
                            user_supplied_arg
                        } else {
                            default.as_ref()
                        }
                    };

                    let argument_value_str = match opt_argument_value {
                        Some(str) => str.as_str(),
                        // None => an empty string
                        None => "",
                    };

                    out.push_str(argument_value_str);
                }
            }
        }
        out
    }
}

/// Custom deserialization function for QuicklinkLink from string
fn deserialize_quicklink_link_from_string<'de, D>(
    deserializer: D,
) -> Result<QuicklinkLink, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let link_str = String::deserialize(deserializer)?;
    let components = parse_quicklink_components(&link_str).map_err(serde::de::Error::custom)?;

    Ok(QuicklinkLink { components })
}

/// Custom serialization function for QuicklinkLink to a string
fn serialize_quicklink_link_to_string<S>(
    link: &QuicklinkLink,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let mut result = String::new();

    for component in &link.components {
        match component {
            QuicklinkLinkComponent::StaticStr(s) => {
                result.push_str(s);
            }
            QuicklinkLinkComponent::DynamicPlaceholder {
                argument_name,
                default,
            } => {
                result.push('{');

                // If it's a simple case (no default), just use the argument name
                if default.is_none() {
                    result.push_str(argument_name);
                } else {
                    // Use the full format with argument_name and default
                    result.push_str(&format!(
                        r#"argument_name: "{}", default: "{}""#,
                        argument_name,
                        default.as_ref().unwrap()
                    ));
                }

                result.push('}');
            }
        }
    }

    serializer.serialize_str(&result)
}

/// A link component is either a static string, or a dynamic placeholder, e.g.,
///
/// "https://www.google.com/search?q={query}"
///
/// The above link can be split into the following components:
///
/// [StaticStr("https://www.google.com/search?q="), DynamicPlaceholder { argument_name: "query", default: None }]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) enum QuicklinkLinkComponent {
    StaticStr(String),
    /// For the valid formats of dynamic placeholder, see the doc comments of `fn parse_dynamic_placeholder()`
    DynamicPlaceholder {
        argument_name: String,
        /// Will use this default value if this dynamic parameter is not supplied
        /// by the user.
        default: Option<String>,
    },
}

#[derive(Debug, PartialEq, Deserialize, Serialize, Clone, Display, Copy)]
#[serde(rename_all(serialize = "snake_case", deserialize = "snake_case"))]
pub enum ExtensionType {
    #[display("Group")]
    Group,
    #[display("Extension")]
    Extension,
    #[display("Command")]
    Command,
    #[display("Application")]
    Application,
    #[display("Script")]
    Script,
    #[display("Quicklink")]
    Quicklink,
    #[display("Setting")]
    Setting,
    #[display("Calculator")]
    Calculator,
    #[display("AI Extension")]
    AiExtension,
}

impl ExtensionType {
    pub(crate) fn contains_sub_items(&self) -> bool {
        self == &Self::Group || self == &Self::Extension
    }
}

/// Helper function to filter out the extensions that do not satisfy the specified conditions.
///
/// used in `list_extensions()`
fn filter_out_extensions(
    extensions: &mut Vec<Extension>,
    query: Option<&str>,
    extension_type: Option<ExtensionType>,
    list_enabled: bool,
) {
    // apply `list_enabled`
    if list_enabled {
        extensions.retain(|ext| ext.enabled);
        for extension in extensions.iter_mut() {
            if extension.r#type.contains_sub_items() {
                if let Some(ref mut commands) = extension.commands {
                    commands.retain(|cmd| cmd.enabled);
                }
                if let Some(ref mut scripts) = extension.scripts {
                    scripts.retain(|script| script.enabled);
                }
                if let Some(ref mut quicklinks) = extension.quicklinks {
                    quicklinks.retain(|link| link.enabled);
                }
            }
        }
    }

    // apply extension type filter to non-group/extension extensions
    if let Some(extension_type) = extension_type {
        assert!(
            extension_type != ExtensionType::Group && extension_type != ExtensionType::Extension,
            "filtering in folder extensions is pointless"
        );

        extensions.retain(|ext| {
            let ty = ext.r#type;
            ty == ExtensionType::Group || ty == ExtensionType::Extension || ty == extension_type
        });

        // Filter sub-extensions to only include the requested type
        for extension in extensions.iter_mut() {
            if extension.r#type.contains_sub_items() {
                if let Some(ref mut commands) = extension.commands {
                    commands.retain(|cmd| cmd.r#type == extension_type);
                }
                if let Some(ref mut scripts) = extension.scripts {
                    scripts.retain(|script| script.r#type == extension_type);
                }
                if let Some(ref mut quicklinks) = extension.quicklinks {
                    quicklinks.retain(|link| link.r#type == extension_type);
                }
            }
        }

        // Application is special, technically, it should never be filtered out by
        // this condition. But if our users will be surprising if they choose a
        // non-Application type and see it in the results. So we do this to remedy the
        // issue
        if let Some(idx) = extensions.iter().position(|ext| {
            ext.developer.is_none()
                && ext.id == built_in::application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
        }) {
            if extension_type != ExtensionType::Application {
                extensions.remove(idx);
            }
        }
    }

    // apply query filter
    if let Some(query) = query {
        let match_closure = |ext: &Extension| {
            let lowercase_title = ext.name.to_lowercase();
            let lowercase_alias = ext.alias.as_ref().map(|alias| alias.to_lowercase());
            let lowercase_query = query.to_lowercase();

            lowercase_title.contains(&lowercase_query)
                || lowercase_alias.map_or(false, |alias| alias.contains(&lowercase_query))
        };

        extensions.retain(|ext| {
            if ext.r#type.contains_sub_items() {
                // Keep all group/extension types
                true
            } else {
                // Apply filter to non-group/extension types
                match_closure(ext)
            }
        });

        // Filter sub-extensions in groups and extensions
        for extension in extensions.iter_mut() {
            if extension.r#type.contains_sub_items() {
                if let Some(ref mut commands) = extension.commands {
                    commands.retain(&match_closure);
                }
                if let Some(ref mut scripts) = extension.scripts {
                    scripts.retain(&match_closure);
                }
                if let Some(ref mut quicklinks) = extension.quicklinks {
                    quicklinks.retain(&match_closure);
                }
            }
        }
    }
}

#[tauri::command]
pub(crate) async fn list_extensions(
    tauri_app_handle: AppHandle,
    query: Option<String>,
    extension_type: Option<ExtensionType>,
    list_enabled: bool,
) -> Result<Vec<Extension>, String> {
    let mut third_party_extensions = third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .expect("global third party extension search source not set")
        .extensions_snapshot()
        .await;

    let built_in_extensions = built_in::list_built_in_extensions(&tauri_app_handle).await?;

    let mut extensions = {
        third_party_extensions.extend(built_in_extensions);

        third_party_extensions
    };

    filter_out_extensions(
        &mut extensions,
        query.as_deref(),
        extension_type,
        list_enabled,
    );

    // Cleanup after filtering extensions, don't do it if filter is not performed.
    //
    // Remove parent extensions (Group/Extension types) that have no sub-items after filtering
    let filter_performed = query.is_some() || extension_type.is_some() || list_enabled;
    if filter_performed {
        extensions.retain(|ext| {
            if !ext.r#type.contains_sub_items() {
                return true;
            }

            // We don't do this filter to applications since it is always empty, load at runtime.
            if ext.developer.is_none()
                && ext.id == built_in::application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
            {
                return true;
            }

            let has_commands = ext
                .commands
                .as_ref()
                .map_or(false, |commands| !commands.is_empty());
            let has_scripts = ext
                .scripts
                .as_ref()
                .map_or(false, |scripts| !scripts.is_empty());
            let has_quicklinks = ext
                .quicklinks
                .as_ref()
                .map_or(false, |quicklinks| !quicklinks.is_empty());

            has_commands || has_scripts || has_quicklinks
        });
    }

    Ok(extensions)
}

/// Initialize all the things that are related to extensions.
pub(crate) async fn init_extensions(tauri_app_handle: &AppHandle) -> Result<(), String> {
    log::trace!("initializing extensions");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    // Third-party extensions
    //
    // 1. Init the global search source variable
    // 2. Init the extensions in search source
    // 3. Register the search source
    let third_party_dir = third_party::get_third_party_extension_directory(&tauri_app_handle);
    if !third_party_dir.try_exists().map_err(|e| e.to_string())? {
        tokio::fs::create_dir_all(&third_party_dir)
            .await
            .map_err(|e| e.to_string())?;
    }
    let extensions =
        third_party::load_third_party_extensions_from_directory(&third_party_dir).await?;
    let search_source = third_party::ThirdPartyExtensionsSearchSource::new(extensions);
    search_source.init(&tauri_app_handle).await.unwrap();
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .set(search_source.clone())
        .unwrap_or_else(|_already_set| {
            panic!(
                "while trying to set the global third party extension search source variable {}, we found it is already set, which should not happen",
                "THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE"
            )
        });
    search_source_registry_tauri_state
        .register_source(search_source)
        .await;

    // Extension store
    search_source_registry_tauri_state
        .register_source(third_party::install::store::ExtensionStore)
        .await;

    // Built-in extensions

    // Built-in extension: Application
    built_in::application::ApplicationSearchSource::prepare_index_and_store(
        tauri_app_handle.clone(),
    )
    .await?;

    // Init the built-in enabled extensions
    let built_in_extensions = built_in::list_built_in_extensions(&tauri_app_handle).await?;
    for built_in_extension in built_in_extensions.iter().filter(|ext| ext.enabled) {
        built_in::init_built_in_extension(
            &tauri_app_handle,
            &built_in_extension,
            &search_source_registry_tauri_state,
        )
        .await?;
    }

    Ok(())
}

#[tauri::command]
pub(crate) async fn enable_extension(
    tauri_app_handle: AppHandle,
    bundle_id: ExtensionBundleId,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::enable_built_in_extension(&tauri_app_handle, &bundle_id_borrowed).await?;
        return Ok(());
    }

    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").enable_extension(&tauri_app_handle, &bundle_id_borrowed).await
}

#[tauri::command]
pub(crate) async fn disable_extension(
    tauri_app_handle: AppHandle,
    bundle_id: ExtensionBundleId,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::disable_built_in_extension(&tauri_app_handle, &bundle_id_borrowed).await?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").disable_extension(&tauri_app_handle, &bundle_id_borrowed).await
}

#[tauri::command]
pub(crate) async fn set_extension_alias(
    tauri_app_handle: AppHandle,
    bundle_id: ExtensionBundleId,
    alias: String,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::set_built_in_extension_alias(&tauri_app_handle, &bundle_id_borrowed, &alias);
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").set_extension_alias(&tauri_app_handle, &bundle_id_borrowed, &alias).await
}

#[tauri::command]
pub(crate) async fn register_extension_hotkey(
    tauri_app_handle: AppHandle,
    bundle_id: ExtensionBundleId,
    hotkey: String,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::register_built_in_extension_hotkey(
            &tauri_app_handle,
            &bundle_id_borrowed,
            &hotkey,
        )?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").register_extension_hotkey(&tauri_app_handle, &bundle_id_borrowed, &hotkey).await
}

/// NOTE: this function won't error out if the extension specified by `extension_id`
/// has no hotkey set because we need it to behave like this.
#[tauri::command]
pub(crate) async fn unregister_extension_hotkey(
    tauri_app_handle: AppHandle,
    bundle_id: ExtensionBundleId,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::unregister_built_in_extension_hotkey(&tauri_app_handle, &bundle_id_borrowed)?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").unregister_extension_hotkey(&tauri_app_handle, &bundle_id_borrowed).await?;

    Ok(())
}

#[tauri::command]
pub(crate) async fn is_extension_enabled(
    tauri_app_handle: AppHandle,
    bundle_id: ExtensionBundleId,
) -> Result<bool, String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        return built_in::is_built_in_extension_enabled(&tauri_app_handle, &bundle_id_borrowed)
            .await;
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").is_extension_enabled(&bundle_id_borrowed).await
}

pub(crate) fn canonicalize_relative_icon_path(
    extension_dir: &Path,
    extension: &mut Extension,
) -> Result<(), String> {
    fn _canonicalize_relative_icon_path(
        extension_dir: &Path,
        extension: &mut Extension,
    ) -> Result<(), String> {
        let icon_str = &extension.icon;
        let icon_path = Path::new(icon_str);

        if icon_path.is_relative() {
            let absolute_icon_path = {
                let mut assets_directory = extension_dir.join(ASSETS_DIRECTORY_FILE_NAME);
                assets_directory.push(icon_path);

                assets_directory
            };

            if absolute_icon_path.try_exists().map_err(|e| e.to_string())? {
                extension.icon = absolute_icon_path
                    .into_os_string()
                    .into_string()
                    .expect("path should be UTF-8 encoded");
            }
        }

        Ok(())
    }

    _canonicalize_relative_icon_path(extension_dir, extension)?;

    if let Some(commands) = &mut extension.commands {
        for command in commands {
            _canonicalize_relative_icon_path(extension_dir, command)?;
        }
    }

    if let Some(scripts) = &mut extension.scripts {
        for script in scripts {
            _canonicalize_relative_icon_path(extension_dir, script)?;
        }
    }

    if let Some(quicklinks) = &mut extension.quicklinks {
        for quicklink in quicklinks {
            _canonicalize_relative_icon_path(extension_dir, quicklink)?;
        }
    }

    Ok(())
}

fn alter_extension_json_file(
    extension_directory: &Path,
    bundle_id: &ExtensionBundleIdBorrowed<'_>,
    how: impl Fn(&mut Extension) -> Result<(), String>,
) -> Result<(), String> {
    /// Perform `how` against the extension specified by `extension_id`.
    ///
    /// Please note that `bundle` could point to a sub extension if `sub_extension_id` is Some.
    pub(crate) fn modify(
        root_extension: &mut Extension,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
        how: impl FnOnce(&mut Extension) -> Result<(), String>,
    ) -> Result<(), String> {
        let (parent_extension_id, opt_sub_extension_id) =
            (bundle_id.extension_id, bundle_id.sub_extension_id);
        assert_eq!(
            parent_extension_id, root_extension.id,
            "modify() should be invoked against a parent extension"
        );

        let Some(sub_extension_id) = opt_sub_extension_id else {
            how(root_extension)?;
            return Ok(());
        };

        // Search in commands
        if let Some(ref mut commands) = root_extension.commands {
            if let Some(command) = commands.iter_mut().find(|cmd| cmd.id == sub_extension_id) {
                how(command)?;
                return Ok(());
            }
        }

        // Search in scripts
        if let Some(ref mut scripts) = root_extension.scripts {
            if let Some(script) = scripts.iter_mut().find(|scr| scr.id == sub_extension_id) {
                how(script)?;
                return Ok(());
            }
        }

        // Search in quicklinks
        if let Some(ref mut quicklinks) = root_extension.quicklinks {
            if let Some(link) = quicklinks.iter_mut().find(|lnk| lnk.id == sub_extension_id) {
                how(link)?;
                return Ok(());
            }
        }

        Err(format!(
            "extension [{:?}] not found in {:?}",
            bundle_id, root_extension
        ))
    }

    log::debug!(
        "altering extension JSON file for extension [{:?}]",
        bundle_id
    );

    let json_file_path = {
        let mut path = extension_directory.to_path_buf();

        if let Some(developer) = bundle_id.developer {
            path.push(developer);
        }
        path.push(bundle_id.extension_id);
        path.push(PLUGIN_JSON_FILE_NAME);

        path
    };

    let mut extension = serde_json::from_reader::<_, Extension>(
        std::fs::File::open(&json_file_path)
            .with_context(|| {
                format!(
                    "the [{}] file for extension [{:?}] is missing or broken",
                    PLUGIN_JSON_FILE_NAME, bundle_id
                )
            })
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    modify(&mut extension, bundle_id, how)?;

    std::fs::write(
        &json_file_path,
        serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Helper function to impl Deserialize for `QuicklinkLink`.
///
/// Parse a quicklink string into components, handling dynamic placeholders
fn parse_quicklink_components(input: &str) -> Result<Vec<QuicklinkLinkComponent>, String> {
    let mut components = Vec::new();
    let mut current_pos = 0;
    let chars: Vec<char> = input.chars().collect();

    while current_pos < chars.len() {
        // Find the next opening brace
        if let Some(open_pos) = chars[current_pos..].iter().position(|&c| c == '{') {
            let absolute_open_pos = current_pos + open_pos;

            // Add static string before the opening brace (if any)
            if absolute_open_pos > current_pos {
                let static_str: String = chars[current_pos..absolute_open_pos].iter().collect();
                components.push(QuicklinkLinkComponent::StaticStr(static_str));
            }

            // Find the matching closing brace, handling nested braces
            let mut brace_count = 1;
            let mut close_pos = None;

            for (i, &c) in chars[absolute_open_pos + 1..].iter().enumerate() {
                match c {
                    '{' => brace_count += 1,
                    '}' => {
                        brace_count -= 1;
                        if brace_count == 0 {
                            close_pos = Some(i);
                            break;
                        }
                    }
                    _ => {}
                }
            }

            if let Some(close_pos) = close_pos {
                let absolute_close_pos = absolute_open_pos + 1 + close_pos;

                // Extract the placeholder content
                let placeholder_content: String = chars[absolute_open_pos + 1..absolute_close_pos]
                    .iter()
                    .collect();
                let placeholder = parse_dynamic_placeholder(&placeholder_content)?;
                components.push(placeholder);

                current_pos = absolute_close_pos + 1;
            } else {
                return Err(format!(
                    "Unmatched opening brace at position {}",
                    absolute_open_pos
                ));
            }
        } else {
            // No more opening braces, add the remaining string as static
            if current_pos < chars.len() {
                let static_str: String = chars[current_pos..].iter().collect();
                components.push(QuicklinkLinkComponent::StaticStr(static_str));
            }
            break;
        }
    }

    Ok(components)
}

/// Helper function to impl Deserialize for `QuicklinkLink`.
///
/// Parse the content inside braces into a DynamicPlaceholder.
///
/// It supports the following formats:
///
/// 1. {query}: should be parsed to DynamicPlaceholder {argument_name: "query", default: None }
/// 2. {argument_name: "query" }: should be parsed to DynamicPlaceholder {argument_name: "query", default: None }
/// 3. {argument_name: "query", default: "rust" }: should be parsed to DynamicPlaceholder {argument_name: "query", default: Some("rust") }
fn parse_dynamic_placeholder(content: &str) -> Result<QuicklinkLinkComponent, String> {
    let trimmed = content.trim();

    // Case 1: {query} - simple argument name
    if !trimmed.contains(':') && !trimmed.contains(',') {
        return Ok(QuicklinkLinkComponent::DynamicPlaceholder {
            argument_name: trimmed.to_string(),
            default: None,
        });
    }

    // Case 2 & 3: {argument_name: "query"} or {argument_name: "query", default: "rust"}
    // Parse as a simplified JSON-like structure
    let mut argument_name = None;
    let mut default_value = None;

    // Split by commas and process each part
    let parts: Vec<&str> = trimmed.split(',').collect();

    for part in parts {
        let part = part.trim();
        if let Some(colon_pos) = part.find(':') {
            let key = part[..colon_pos].trim();
            let value = part[colon_pos + 1..].trim();

            // Remove quotes from value if present
            let value = if (value.starts_with('"') && value.ends_with('"'))
                || (value.starts_with('\'') && value.ends_with('\''))
            {
                &value[1..value.len() - 1]
            } else {
                value
            };

            match key {
                "argument_name" => argument_name = Some(value.to_string()),
                "default" => default_value = Some(value.to_string()),
                _ => return Err(format!("Unknown key '{}' in placeholder", key)),
            }
        }
    }

    let argument_name = argument_name.ok_or("Missing argument_name in placeholder")?;

    Ok(QuicklinkLinkComponent::DynamicPlaceholder {
        argument_name,
        default: default_value,
    })
}

/// Built-in extension settings
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) struct ExtensionSettings {
    /// If set, Coco main window would hide before opening this document/e
    pub(crate) hide_before_open: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_deserialize_quicklink_link_case1() {
        // Case 1: {query} - simple argument name
        let test_string = "https://www.google.com/search?q={query}";
        let components = parse_quicklink_components(test_string).unwrap();
        let link = QuicklinkLink { components };

        assert_eq!(link.components.len(), 2);

        match &link.components[0] {
            QuicklinkLinkComponent::StaticStr(s) => {
                assert_eq!(s, "https://www.google.com/search?q=")
            }
            _ => panic!("Expected StaticStr component"),
        }

        match &link.components[1] {
            QuicklinkLinkComponent::DynamicPlaceholder {
                argument_name,
                default,
            } => {
                assert_eq!(argument_name, "query");
                assert_eq!(default, &None);
            }
            _ => panic!("Expected DynamicPlaceholder component"),
        }
    }

    #[test]
    fn test_deserialize_quicklink_link_case2() {
        // Case 2: {argument_name: "query"} - explicit argument name
        let test_string = r#"https://www.google.com/search?q={argument_name: "query"}"#;
        let components = parse_quicklink_components(test_string).unwrap();
        let link = QuicklinkLink { components };

        assert_eq!(link.components.len(), 2);

        match &link.components[0] {
            QuicklinkLinkComponent::StaticStr(s) => {
                assert_eq!(s, "https://www.google.com/search?q=")
            }
            _ => panic!("Expected StaticStr component"),
        }

        match &link.components[1] {
            QuicklinkLinkComponent::DynamicPlaceholder {
                argument_name,
                default,
            } => {
                assert_eq!(argument_name, "query");
                assert_eq!(default, &None);
            }
            _ => panic!("Expected DynamicPlaceholder component"),
        }
    }

    #[test]
    fn test_deserialize_quicklink_link_case3() {
        // Case 3: {argument_name: "query", default: "rust"} - with default value
        let test_string =
            r#"https://www.google.com/search?q={argument_name: "query", default: "rust"}"#;
        let components = parse_quicklink_components(test_string).unwrap();
        let link = QuicklinkLink { components };

        assert_eq!(link.components.len(), 2);

        match &link.components[0] {
            QuicklinkLinkComponent::StaticStr(s) => {
                assert_eq!(s, "https://www.google.com/search?q=")
            }
            _ => panic!("Expected StaticStr component"),
        }

        match &link.components[1] {
            QuicklinkLinkComponent::DynamicPlaceholder {
                argument_name,
                default,
            } => {
                assert_eq!(argument_name, "query");
                assert_eq!(default, &Some("rust".to_string()));
            }
            _ => panic!("Expected DynamicPlaceholder component"),
        }
    }

    #[test]
    fn test_deserialize_quicklink_link_multiple_placeholders() {
        // Test multiple placeholders in one string
        let test_string = r#"https://example.com/{category}/search?q={query}&lang={argument_name: "language", default: "en"}"#;
        let components = parse_quicklink_components(test_string).unwrap();
        let link = QuicklinkLink { components };

        assert_eq!(link.components.len(), 6);

        // Check the components
        match &link.components[0] {
            QuicklinkLinkComponent::StaticStr(s) => assert_eq!(s, "https://example.com/"),
            _ => panic!("Expected StaticStr component"),
        }

        match &link.components[1] {
            QuicklinkLinkComponent::DynamicPlaceholder {
                argument_name,
                default,
            } => {
                assert_eq!(argument_name, "category");
                assert_eq!(default, &None);
            }
            _ => panic!("Expected DynamicPlaceholder component"),
        }

        match &link.components[2] {
            QuicklinkLinkComponent::StaticStr(s) => assert_eq!(s, "/search?q="),
            _ => panic!("Expected StaticStr component"),
        }

        match &link.components[3] {
            QuicklinkLinkComponent::DynamicPlaceholder {
                argument_name,
                default,
            } => {
                assert_eq!(argument_name, "query");
                assert_eq!(default, &None);
            }
            _ => panic!("Expected DynamicPlaceholder component"),
        }

        match &link.components[4] {
            QuicklinkLinkComponent::StaticStr(s) => assert_eq!(s, "&lang="),
            _ => panic!("Expected StaticStr component"),
        }

        match &link.components[5] {
            QuicklinkLinkComponent::DynamicPlaceholder {
                argument_name,
                default,
            } => {
                assert_eq!(argument_name, "language");
                assert_eq!(default, &Some("en".to_string()));
            }
            _ => panic!("Expected DynamicPlaceholder component"),
        }
    }

    #[test]
    fn test_deserialize_quicklink_link_no_placeholders() {
        // Test string with no placeholders
        let test_string = "https://www.google.com/search?q=fixed";
        let components = parse_quicklink_components(test_string).unwrap();
        let link = QuicklinkLink { components };

        assert_eq!(link.components.len(), 1);

        match &link.components[0] {
            QuicklinkLinkComponent::StaticStr(s) => {
                assert_eq!(s, "https://www.google.com/search?q=fixed")
            }
            _ => panic!("Expected StaticStr component"),
        }
    }

    #[test]
    fn test_deserialize_quicklink_link_error_unmatched_brace() {
        // Test error case with unmatched brace
        let test_string = "https://www.google.com/search?q={query";
        let result = parse_quicklink_components(test_string);

        assert!(result.is_err());
    }

    /// Unknown argument a and b
    #[test]
    fn test_deserialize_quicklink_link_unknown_arguments() {
        let test_string = r#"https://www.google.com/search?q={a: "a", b: "b"}"#;
        let result = parse_quicklink_components(test_string);

        assert!(result.is_err());
    }

    #[test]
    fn test_serialize_quicklink_link_empty_components() {
        // Case 1: Empty components should result in empty string
        let link = QuicklinkLink { components: vec![] };

        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_quicklink_link_to_string(&link, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(serialized, r#""""#); // Empty string
    }

    #[test]
    fn test_serialize_quicklink_link_static_str_only() {
        // Case 2: Only StaticStr components
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::StaticStr("rust".to_string()),
            ],
        };

        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_quicklink_link_to_string(&link, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(serialized, r#""https://www.google.com/search?q=rust""#);
    }

    #[test]
    fn test_serialize_quicklink_link_dynamic_placeholder_only() {
        // Case 3: Only DynamicPlaceholder components
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: None,
                },
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "language".to_string(),
                    default: Some("en".to_string()),
                },
            ],
        };

        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_quicklink_link_to_string(&link, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(
            serialized,
            r#""{query}{argument_name: \"language\", default: \"en\"}""#
        );
    }

    #[test]
    fn test_serialize_quicklink_link_mixed_components() {
        // Case 4: Mix of StaticStr and DynamicPlaceholder components
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: None,
                },
                QuicklinkLinkComponent::StaticStr("&lang=".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "language".to_string(),
                    default: Some("en".to_string()),
                },
            ],
        };

        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_quicklink_link_to_string(&link, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(
            serialized,
            r#""https://www.google.com/search?q={query}&lang={argument_name: \"language\", default: \"en\"}""#
        );
    }

    #[test]
    fn test_serialize_quicklink_link_dynamic_placeholder_no_default() {
        // Additional test: DynamicPlaceholder without default value
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://example.com/".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "category".to_string(),
                    default: None,
                },
                QuicklinkLinkComponent::StaticStr("/items".to_string()),
            ],
        };

        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_quicklink_link_to_string(&link, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(serialized, r#""https://example.com/{category}/items""#);
    }

    #[test]
    fn test_serialize_quicklink_link_dynamic_placeholder_with_default() {
        // Additional test: DynamicPlaceholder with default value
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://api.example.com/".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "version".to_string(),
                    default: Some("v1".to_string()),
                },
                QuicklinkLinkComponent::StaticStr("/data".to_string()),
            ],
        };

        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_quicklink_link_to_string(&link, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(
            serialized,
            r#""https://api.example.com/{argument_name: \"version\", default: \"v1\"}/data""#
        );
    }

    #[test]
    fn test_quicklink_link_arguments_empty_components() {
        let link = QuicklinkLink { components: vec![] };

        let map = quicklink_link_arguments(link);
        assert!(map.is_empty());
    }

    #[test]
    fn test_quicklink_link_arguments_static_str_only() {
        let link = QuicklinkLink {
            components: vec![QuicklinkLinkComponent::StaticStr(
                "https://api.example.com/".to_string(),
            )],
        };

        let map = quicklink_link_arguments(link);
        assert!(map.is_empty());
    }

    #[test]
    fn test_quicklink_link_arguments_dynamic_placeholder_only() {
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: None,
                },
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "language".to_string(),
                    default: Some("en".to_string()),
                },
            ],
        };

        let map = quicklink_link_arguments(link);

        let expected_map = {
            let mut map = IndexMap::new();
            map.insert("query".into(), None);
            map.insert("language".into(), Some("en".into()));

            map
        };
        assert_eq!(map, expected_map);
    }

    #[test]
    fn test_quicklink_link_concatenate_url_static_components_only() {
        // Case 1: the link (QuicklinkLink) only contains static str components
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::StaticStr("rust".to_string()),
            ],
        };
        let result = link.concatenate_url(&None);
        assert_eq!(result, "https://www.google.com/search?q=rust");
    }

    /// The link has 1 dynamic component with no default value, but `user_supplied_args` is None
    #[test]
    fn test_quicklink_link_concatenate_url_dynamic_no_default_no_args() {
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: None,
                },
            ],
        };
        let result = link.concatenate_url(&None);
        assert_eq!(result, "https://www.google.com/search?q=");
    }

    /// The link has 1 dynamic component with no default value, `user_supplied_args` is Some(hashmap),
    /// but this dynamic argument is not provided in the hashmap
    #[test]
    fn test_quicklink_link_concatenate_url_dynamic_no_default_missing_from_args() {
        use std::collections::HashMap;

        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: None,
                },
            ],
        };
        let mut user_args = HashMap::new();
        user_args.insert("other_param".to_string(), "value".to_string());
        let result = link.concatenate_url(&Some(user_args));
        assert_eq!(result, "https://www.google.com/search?q=");
    }

    /// The link has 1 dynamic component with a default value, `user_supplied_args` is None
    #[test]
    fn test_quicklink_link_concatenate_url_dynamic_with_default_no_args() {
        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: Some("rust".to_string()),
                },
            ],
        };
        let result = link.concatenate_url(&None);
        assert_eq!(result, "https://www.google.com/search?q=rust");
    }

    /// The link has 1 dynamic component with a default value, `user_supplied_args` is Some(hashmap),
    /// this dynamic argument is not provided in the hashmap
    #[test]
    fn test_quicklink_link_concatenate_url_dynamic_with_default_missing_from_args() {
        use std::collections::HashMap;

        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: Some("rust".to_string()),
                },
            ],
        };
        let mut user_args = HashMap::new();
        user_args.insert("other_param".to_string(), "value".to_string());
        let result = link.concatenate_url(&Some(user_args));
        assert_eq!(result, "https://www.google.com/search?q=rust");
    }

    /// The link has 1 dynamic component with a default value, `user_supplied_args` is Some(hashmap),
    /// hashmap contains the dynamic parameter.
    ///
    /// (the user-supplied argument should be used, the default value should be ignored)
    #[test]
    fn test_quicklink_link_concatenate_url_dynamic_with_default_provided_in_args() {
        use std::collections::HashMap;

        let link = QuicklinkLink {
            components: vec![
                QuicklinkLinkComponent::StaticStr("https://www.google.com/search?q=".to_string()),
                QuicklinkLinkComponent::DynamicPlaceholder {
                    argument_name: "query".to_string(),
                    default: Some("rust".to_string()),
                },
            ],
        };
        let mut user_args = HashMap::new();
        user_args.insert("query".to_string(), "python".to_string());
        let result = link.concatenate_url(&Some(user_args));
        assert_eq!(result, "https://www.google.com/search?q=python");
    }

    /// The link is empty
    #[test]
    fn test_quicklink_link_concatenate_url_empty_link() {
        let link = QuicklinkLink { components: vec![] };
        let result = link.concatenate_url(&None);
        assert_eq!(result, "");
    }
}
