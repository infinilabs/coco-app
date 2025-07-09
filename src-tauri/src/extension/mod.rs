pub(crate) mod built_in;
pub(crate) mod third_party;

use crate::common::document::OnOpened;
use crate::{common::register::SearchSourceRegistry, GLOBAL_TAURI_APP_HANDLE};
use anyhow::Context;
use borrowme::{Borrow, ToOwned};
use derive_more::Display;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as Json;
use std::collections::HashSet;
use std::path::Path;
use tauri::Manager;
use third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub const LOCAL_QUERY_SOURCE_TYPE: &str = "local";
const PLUGIN_JSON_FILE_NAME: &str = "plugin.json";
const ASSETS_DIRECTORY_FILE_NAME: &str = "assets";

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, Serialize, Copy, Clone, Hash, PartialEq, Eq, Display)]
#[serde(rename_all(serialize = "lowercase", deserialize = "lowercase"))]
enum Platform {
    #[display("macOS")]
    Macos,
    #[display("Linux")]
    Linux,
    #[display("windows")]
    Windows,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
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
    /// The link to open if this is a QuickLink extension.
    #[serde(skip_serializing_if = "Option::is_none")]
    quicklink: Option<QuickLink>,

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
    settings: Option<Json>,

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
    /// WARNING: the bundle ID returned from this function always has its `sub_extension_id`
    /// set to `None`, this may not be what you want.
    pub(crate) fn bundle_id_borrowed(&self) -> ExtensionBundleIdBorrowed<'_> {
        ExtensionBundleIdBorrowed {
            developer: self.developer.as_deref(),
            extension_id: &self.id,
            sub_extension_id: None,
        }
    }

    /// Whether this extension could be searched.
    pub(crate) fn searchable(&self) -> bool {
        self.on_opened().is_some()
    }
    /// Return what will happen when we open this extension.
    ///
    /// `None` if it cannot be opened.
    pub(crate) fn on_opened(&self) -> Option<OnOpened> {
        match self.r#type {
            ExtensionType::Group => None,
            ExtensionType::Extension => None,
            ExtensionType::Command => Some(OnOpened::Command {
                action: self.action.clone().unwrap_or_else(|| {
                  panic!(
                    "Command extension [{}]'s [action] field is not set, something wrong with your extension validity check", self.id
                  )
                }),
            }),
            ExtensionType::Application => Some(OnOpened::Application {
                app_path: self.id.clone(),
            }),
            ExtensionType::Script => todo!("not supported yet"),
            ExtensionType::Quicklink => todo!("not supported yet"),
            ExtensionType::Setting => todo!("not supported yet"),
            ExtensionType::Calculator => None,
            ExtensionType::AiExtension => None,
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
        if let Some(ref quick_links) = self.quicklinks {
            if let Some(sub_ext) = quick_links.iter().find(|link| link.id == sub_extension_id) {
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
        if let Some(ref mut quick_links) = self.quicklinks {
            if let Some(sub_ext) = quick_links
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

#[derive(Debug, Deserialize, Serialize, Clone)]
pub(crate) struct CommandAction {
    pub(crate) exec: String,
    pub(crate) args: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct QuickLink {
    link: String,
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

/// Helper function to filter out the extensions that do not satisfy the specifies conditions.
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

/// Return value:
///
/// * boolean: indicates if we found any invalid extensions
/// * Vec<Extension>: loaded extensions
#[tauri::command]
pub(crate) async fn list_extensions(
    query: Option<String>,
    extension_type: Option<ExtensionType>,
    list_enabled: bool,
) -> Result<(bool, Vec<Extension>), String> {
    log::trace!("loading extensions");

    let third_party_dir = third_party::THIRD_PARTY_EXTENSIONS_DIRECTORY.as_path();
    if !third_party_dir.try_exists().map_err(|e| e.to_string())? {
        tokio::fs::create_dir_all(third_party_dir)
            .await
            .map_err(|e| e.to_string())?;
    }
    let (third_party_found_invalid_extension, mut third_party_extensions) =
        third_party::list_third_party_extensions(third_party_dir).await?;

    let built_in_extensions = built_in::list_built_in_extensions().await?;

    let found_invalid_extension = third_party_found_invalid_extension;
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

    Ok((found_invalid_extension, extensions))
}

pub(crate) async fn init_extensions(mut extensions: Vec<Extension>) -> Result<(), String> {
    log::trace!("initializing extensions");

    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    built_in::application::ApplicationSearchSource::prepare_index_and_store(
        tauri_app_handle.clone(),
    )
    .await?;

    // extension store
    search_source_registry_tauri_state
        .register_source(third_party::store::ExtensionStore)
        .await;

    // Init the built-in enabled extensions
    for built_in_extension in extensions
        .extract_if(.., |ext| {
            built_in::is_extension_built_in(&ext.bundle_id_borrowed())
        })
        .filter(|ext| ext.enabled)
    {
        built_in::init_built_in_extension(
            tauri_app_handle,
            &built_in_extension,
            &search_source_registry_tauri_state,
        )
        .await?;
    }

    // Now the third-party extensions
    let third_party_search_source = third_party::ThirdPartyExtensionsSearchSource::new(extensions);
    third_party_search_source.init().await?;
    let third_party_search_source_clone = third_party_search_source.clone();
    // Set the global search source so that we can access it in `#[tauri::command]`s
    // ignore the result because this function will be invoked twice, which
    // means this global variable will be set twice.
    let _ = THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.set(third_party_search_source_clone);
    search_source_registry_tauri_state
        .register_source(third_party_search_source)
        .await;

    Ok(())
}

#[tauri::command]
pub(crate) async fn enable_extension(bundle_id: ExtensionBundleId) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::enable_built_in_extension(&bundle_id_borrowed).await?;
        return Ok(());
    }

    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").enable_extension(&bundle_id_borrowed).await
}

#[tauri::command]
pub(crate) async fn disable_extension(bundle_id: ExtensionBundleId) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::disable_built_in_extension(&bundle_id_borrowed).await?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").disable_extension(&bundle_id_borrowed).await
}

#[tauri::command]
pub(crate) async fn set_extension_alias(
    bundle_id: ExtensionBundleId,
    alias: String,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::set_built_in_extension_alias(&bundle_id_borrowed, &alias);
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").set_extension_alias(&bundle_id_borrowed, &alias).await
}

#[tauri::command]
pub(crate) async fn register_extension_hotkey(
    bundle_id: ExtensionBundleId,
    hotkey: String,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::register_built_in_extension_hotkey(&bundle_id_borrowed, &hotkey)?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").register_extension_hotkey(&bundle_id_borrowed, &hotkey).await
}

/// NOTE: this function won't error out if the extension specified by `extension_id`
/// has no hotkey set because we need it to behave like this.
#[tauri::command]
pub(crate) async fn unregister_extension_hotkey(
    bundle_id: ExtensionBundleId,
) -> Result<(), String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        built_in::unregister_built_in_extension_hotkey(&bundle_id_borrowed)?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").unregister_extension_hotkey(&bundle_id_borrowed).await?;

    Ok(())
}

#[tauri::command]
pub(crate) async fn is_extension_enabled(bundle_id: ExtensionBundleId) -> Result<bool, String> {
    let bundle_id_borrowed = bundle_id.borrow();

    if built_in::is_extension_built_in(&bundle_id_borrowed) {
        return built_in::is_built_in_extension_enabled(&bundle_id_borrowed).await;
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

    if let Some(quick_links) = &mut extension.quicklinks {
        for quick_link in quick_links {
            _canonicalize_relative_icon_path(extension_dir, quick_link)?;
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

        // Search in quick_links
        if let Some(ref mut quick_links) = root_extension.quicklinks {
            if let Some(link) = quick_links
                .iter_mut()
                .find(|lnk| lnk.id == sub_extension_id)
            {
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
