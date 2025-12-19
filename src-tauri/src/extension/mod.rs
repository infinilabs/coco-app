pub(crate) mod api;
pub(crate) mod built_in;
pub(crate) mod third_party;
pub(crate) mod view_extension;

use crate::common::document::ExtensionOnOpened;
use crate::common::document::ExtensionOnOpenedType;
use crate::common::document::OnOpened;
use crate::common::error::ReportErrorStyle;
use crate::common::error::report_error;
use crate::common::register::SearchSourceRegistry;
use crate::util::platform::Platform;
use crate::util::version::COCO_VERSION;
use crate::util::version::parse_coco_semver;
use anyhow::Context;
use bitflags::bitflags;
use borrowme::{Borrow, ToOwned};
use derive_more::Display;
use indexmap::IndexMap;
use semver::Version as SemVer;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as Json;
use std::collections::HashMap;
use std::collections::HashSet;
use std::io;
use std::ops::Deref;
use std::path::Path;
use tauri::{AppHandle, Manager};
use third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub const LOCAL_QUERY_SOURCE_TYPE: &str = "local";
const PLUGIN_JSON_FILE_NAME: &str = "plugin.json";
const ASSETS_DIRECTORY_FILE_NAME: &str = "assets";
const PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION: &str = "minimum_coco_version";

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
    /// * For built-in extensions, this is None.
    /// * For third-party main extensions, this field contains the extension developer ID.
    /// * For third-party sub extensions, this field is be None.
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

    /*
     * If this extension is of type Group or Extension, then it behaves like a
     * directory, i.e., it could contain sub items.
     */
    commands: Option<Vec<Extension>>,
    scripts: Option<Vec<Extension>>,
    quicklinks: Option<Vec<Extension>>,
    views: Option<Vec<Extension>>,

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

    /// For View extensions, path to the HTML file/page that coco will load
    /// and render. Otherwise, `None`.
    ///
    /// It could be a path relative to the extension root directory, Coco will
    /// canonicalize it in that case.
    page: Option<String>,

    ui: Option<ViewExtensionUISettings>,

    /// Permission that this extension requires.
    permission: Option<ExtensionPermission>,

    /// The version of Coco app that this extension requires.
    ///
    /// If not set, then this extension is compatible with all versions of Coco app.
    ///
    /// It is only for third-party extensions. Built-in extensions should always
    /// set this field to `None`.
    #[serde(deserialize_with = "deserialize_coco_semver")]
    #[serde(serialize_with = "serialize_coco_semver")]
    // None if this field is missing, required as we use custom deserilize method.
    #[serde(default)]
    minimum_coco_version: Option<SemVer>,

    /*
     * The following fields are currently useless to us but are needed by our
     * extension store.
     *
     * Since we do not use them, just accept them regardless of what they are.
     */
    screenshots: Option<Json>,
    url: Option<Json>,
    version: Option<Json>,
}

/// Settings that control the built-in UI Components
#[serde_inline_default::serde_inline_default]
#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
pub(crate) struct ViewExtensionUISettings {
    /// Show the search bar
    #[serde_inline_default(true)]
    search_bar: bool,
    /// Show the filter bar
    #[serde_inline_default(true)]
    filter_bar: bool,
    /// Show the footer
    #[serde_inline_default(true)]
    footer: bool,
    /// The recommended width of the window for this extension
    width: Option<u32>,
    /// The recommended heigh of the window for this extension
    height: Option<u32>,
    /// Is the extension window's size adjustable?
    #[serde_inline_default(false)]
    resizable: bool,
    /// Detch the extension window from Coco's main window.
    ///
    /// If true, user can click the detach button to open this
    /// extension in a seprate window.
    #[serde_inline_default(false)]
    detachable: bool,
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

#[tauri::command]
pub(crate) fn extension_on_opened(extension: Extension) -> Option<OnOpened> {
    _extension_on_opened(&extension)
}

/// Return what will happen when we open this extension.
///
/// `None` if it cannot be opened.
pub(crate) fn _extension_on_opened(extension: &Extension) -> Option<OnOpened> {
    let settings = extension.settings.clone();
    let permission = extension.permission.clone();

    match extension.r#type {
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
              action: extension.action.clone().unwrap_or_else(|| {
                panic!(
                  "Command extension [{}]'s [action] field is not set, something wrong with your extension validity check", extension.id
                )
              }),
          };

            let extension_on_opened = ExtensionOnOpened {
                ty,
                settings,
                permission,
            };

            Some(OnOpened::Extension(extension_on_opened))
        }
        ExtensionType::Quicklink => {
            let quicklink = extension.quicklink.clone().unwrap_or_else(|| {
              panic!(
                "Quicklink extension [{}]'s [quicklink] field is not set, something wrong with your extension validity check", extension.id
              )
            });

            let ty = ExtensionOnOpenedType::Quicklink {
                link: quicklink.link,
                open_with: quicklink.open_with,
            };

            let extension_on_opened = ExtensionOnOpened {
                ty,
                settings,
                permission,
            };

            Some(OnOpened::Extension(extension_on_opened))
        }
        ExtensionType::Script => todo!("not supported yet"),
        ExtensionType::Setting => todo!("not supported yet"),
        ExtensionType::View => {
            let name = extension.name.clone();
            let icon = extension.icon.clone();
            let page = extension.page.as_ref().unwrap_or_else(|| {
                panic!("View extension [{}]'s [page] field is not set, something wrong with your extension validity check", extension.id);
            }).clone();
            let ui = extension.ui.clone();

            let extension_on_opened_type = ExtensionOnOpenedType::View {
                name,
                icon,
                page,
                ui,
            };
            let extension_on_opened = ExtensionOnOpened {
                ty: extension_on_opened_type,
                settings,
                permission,
            };
            let on_opened = OnOpened::Extension(extension_on_opened);

            Some(on_opened)
        }
        ExtensionType::Unknown => {
            unreachable!("Extensions of type [Unknown] should never be opened")
        }
    }
}

impl Extension {
    /// Whether this extension could be searched.
    pub(crate) fn searchable(&self) -> bool {
        _extension_on_opened(self).is_some()
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
        if let Some(ref views) = self.views {
            if let Some(sub_ext) = views.iter().find(|view| view.id == sub_extension_id) {
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
        if let Some(ref mut views) = self.views {
            if let Some(sub_ext) = views.iter_mut().find(|view| view.id == sub_extension_id) {
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

/// Deserialize Coco SemVer from a string.
///
/// This function adapts `parse_coco_semver` to work with serde's `deserialize_with`
/// attribute.
fn deserialize_coco_semver<'de, D>(deserializer: D) -> Result<Option<SemVer>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let version_str: Option<String> = Option::deserialize(deserializer)?;
    let Some(version_str) = version_str else {
        return Ok(None);
    };

    let semver = match parse_coco_semver(&version_str) {
        Ok(ver) => ver,
        Err(e) => {
            let error_msg = report_error(&e, ReportErrorStyle::SingleLine);
            return Err(serde::de::Error::custom(&error_msg));
        }
    };

    Ok(Some(semver))
}

/// Serialize Coco SemVer to a string.
///
/// For a `SemVer`, there are 2 possible input cases, guarded by `to_semver()`:
///
/// 1. "x.y.z" => "x.y.z"
/// 2. "x.y.z-SNAPSHOT.2560" => "x.y.z-SNAPSHOT-2560"
fn serialize_coco_semver<S>(version: &Option<SemVer>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    match version {
        Some(v) => {
            assert!(v.build.is_empty());

            let s = if v.pre.is_empty() {
                format!("{}.{}.{}", v.major, v.minor, v.patch)
            } else {
                format!(
                    "{}.{}.{}-{}",
                    v.major,
                    v.minor,
                    v.patch,
                    v.pre.as_str().replace('.', "-")
                )
            };
            serializer.serialize_str(&s)
        }
        None => serializer.serialize_none(),
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
        user_supplied_args: &Option<HashMap<String, Json>>,
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
                    let opt_argument_value: Option<&str> = {
                        let user_supplied_arg = user_supplied_args
                            .as_ref()
                            .and_then(|map| map.get(argument_name.as_str()));

                        if user_supplied_arg.is_some() {
                            user_supplied_arg.map(|json| {
                                json.as_str()
                                    .expect("quicklink should provide string arguments")
                            })
                        } else {
                            default.as_deref()
                        }
                    };

                    let argument_value_str = match opt_argument_value {
                        Some(str) => str,
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

#[derive(Debug, PartialEq, Deserialize, Serialize, Clone, Display, Copy, Eq)]
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
    #[display("View")]
    View,
    /// Add this variant for better compatibility: Future versions of Coco may
    /// add new extension types that older versions of Coco are not aware of.
    #[display("Unknown")]
    Unknown,
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
                if let Some(ref mut views) = extension.views {
                    views.retain(|link| link.enabled);
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

            if ty.contains_sub_items() {
                /*
                 * We should not filter out group/extension extensions, with 2
                 * exceptions: "Applications" and "File Search". They contains
                 * no sub-extensions, so we treat them as normal extensions.
                 *
                 * When `extenison_type` is "Application", we return the "Applications"
                 * extension as well because it is the entry to access the application
                 * list.
                 */
                if ext.developer.is_none()
                    && ext.id == built_in::application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
                {
                    ty == extension_type || extension_type == ExtensionType::Application
                } else if ext.developer.is_none() && ext.id == built_in::file_search::EXTENSION_ID {
                    ty == extension_type
                } else {
                    // We should not filter out group/extension extensions
                    true
                }
            } else {
                ty == extension_type
            }
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
                if let Some(ref mut views) = extension.views {
                    views.retain(|link| link.r#type == extension_type);
                }
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
                /*
                 * We should keep all the group/extension extensions. But we
                 * have 2 exceptions: "Applications" and "File Search". Even
                 * though they are of type group/extension, they do not contain
                 * sub-extensions, so they are more like commands, apply the
                 * `match_closure` here
                 */
                if ext.developer.is_none()
                    && (ext.id
                        == built_in::application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
                        || ext.id == built_in::file_search::EXTENSION_ID)
                {
                    match_closure(ext)
                } else {
                    // Keep all group/extension types
                    true
                }
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
                if let Some(ref mut views) = extension.views {
                    views.retain(&match_closure);
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
    // Remove parent extensions (Group/Extension types) that have no sub-items
    // after filtering
    let filter_performed = query.is_some() || extension_type.is_some() || list_enabled;
    if filter_performed {
        extensions.retain(|ext| {
            if !ext.r#type.contains_sub_items() {
                return true;
            }

            /*
             * Two exceptions: "Applications" and "File Search"
             *
             * They are of type group/extension, but they contain no sub
             * extensions, which means technically, we should filter them
             * out. However, we sould not do this because they are not real
             * group/extension extensions.
             */
            if ext.developer.is_none() {
                if ext.id == built_in::application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
                    || ext.id == built_in::file_search::EXTENSION_ID
                {
                    return true;
                }
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

/// Is `extension` compatible with the current running Coco app?
///
/// It is defined as a tauri command rather than an associated function because
/// it will be used in frontend code as well.
///
/// Async tauri commands are required to return `Result<T, E>`, this function
/// only needs to return a boolean, so it is not marked async.
#[tauri::command]
pub(crate) fn is_extension_compatible(extension: Extension) -> bool {
    let Some(ref minimum_coco_version) = extension.minimum_coco_version else {
        return true;
    };

    COCO_VERSION.deref() >= minimum_coco_version
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
        built_in::set_built_in_extension_alias(&tauri_app_handle, &bundle_id_borrowed, &alias)?;
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
) -> Result<(), io::Error> {
    fn _canonicalize_relative_icon_path(
        extension_dir: &Path,
        extension: &mut Extension,
    ) -> Result<(), io::Error> {
        let icon_str = &extension.icon;
        let icon_path = Path::new(icon_str);

        if icon_path.is_relative() {
            // If we enter this if statement, then there are 2 possible cases:
            //
            // 1. icon_path is a font class code, e.g., "font_coco"
            // 2. icon_path is a indeed a relative path
            //
            // We distinguish between these 2 cases by checking if `absolute_icon_path` exists

            let absolute_icon_path = {
                let mut assets_directory = extension_dir.join(ASSETS_DIRECTORY_FILE_NAME);
                assets_directory.push(icon_path);

                assets_directory
            };

            if absolute_icon_path.try_exists()? {
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

    if let Some(views) = &mut extension.views {
        for view in views {
            _canonicalize_relative_icon_path(extension_dir, view)?;
        }
    }

    Ok(())
}

pub(crate) fn canonicalize_relative_page_path(
    extension_dir: &Path,
    extension: &mut Extension,
) -> Result<(), io::Error> {
    fn _canonicalize_view_extension_page_path(
        extension_dir: &Path,
        extension: &mut Extension,
    ) -> Result<(), io::Error> {
        let page = extension
            .page
            .as_ref()
            .expect("this should be invoked on a View extension");

        // Skip HTTP links
        if let Ok(url) = url::Url::parse(page)
            && ["http", "https"].contains(&url.scheme())
        {
            return Ok(());
        }

        let page_path = Path::new(page);

        if page_path.is_relative() {
            let absolute_page_path = extension_dir.join(page_path);

            if absolute_page_path.try_exists()? {
                extension.page = Some(
                    absolute_page_path
                        .into_os_string()
                        .into_string()
                        .expect("path should be UTF-8 encoded"),
                );
            }
        }

        Ok(())
    }

    if extension.r#type == ExtensionType::View {
        _canonicalize_view_extension_page_path(extension_dir, extension)?;
    } else if extension.r#type.contains_sub_items()
        && let Some(ref mut views) = extension.views
    {
        for view in views {
            _canonicalize_view_extension_page_path(extension_dir, view)?;
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

        // Search in views
        if let Some(ref mut views) = root_extension.views {
            if let Some(view) = views.iter_mut().find(|v| v.id == sub_extension_id) {
                how(view)?;
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) struct ExtensionPermission {
    fs: Option<Vec<ExtensionFileSystemPermission>>,
    http: Option<Vec<ExtensionHttpPermission>>,
    api: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) struct ExtensionFileSystemPermission {
    pub(crate) path: String,
    pub(crate) access: FileSystemAccess,
}

bitflags! {
    #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
    pub(crate) struct FileSystemAccess: u8 {
        const READ = 0b00000001;
        const WRITE = 0b00000010;
    }
}

impl Serialize for FileSystemAccess {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut access_vec = Vec::new();
        if self.contains(FileSystemAccess::READ) {
            access_vec.push("read");
        }
        if self.contains(FileSystemAccess::WRITE) {
            access_vec.push("write");
        }
        access_vec.serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for FileSystemAccess {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let access_vec: Vec<String> = Vec::deserialize(deserializer)?;
        let mut access = FileSystemAccess::empty();

        for access_type in access_vec {
            match access_type.as_str() {
                "read" => access |= FileSystemAccess::READ,
                "write" => access |= FileSystemAccess::WRITE,
                _ => {
                    return Err(serde::de::Error::unknown_variant(
                        access_type.as_str(),
                        &["read", "write"],
                    ));
                }
            }
        }

        Ok(access)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) struct ExtensionHttpPermission {
    pub(crate) host: String,
}

/// Calculates a similarity score between a query and a text, aiming for a [0, 1] range.
/// Assumes query and text are already lowercased.
///
/// Used in extension_to_hit().
fn calculate_text_similarity(query: &str, text: &str) -> Option<f64> {
    if query.is_empty() || text.is_empty() {
        return None;
    }

    if text == query {
        return Some(1.0); // Perfect match
    }

    let query_len = query.len() as f64;
    let text_len = text.len() as f64;
    let ratio = query_len / text_len;
    let mut score: f64 = 0.0;

    // Case 1: Text starts with the query (prefix match)
    // Score: base 0.5, bonus up to 0.4 for how much of `text` is covered by `query`. Max 0.9.
    if text.starts_with(query) {
        score = score.max(0.5 + 0.4 * ratio);
    }

    // Case 2: Text contains the query (substring match, not necessarily prefix)
    // Score: base 0.3, bonus up to 0.3. Max 0.6.
    // `score.max` ensures that if it's both a prefix and contains, the higher score (prefix) is taken.
    if text.contains(query) {
        score = score.max(0.3 + 0.3 * ratio);
    }

    // Case 3: Fallback for "all query characters exist in text" (order-independent)
    if score < 0.2 {
        if query.chars().all(|c_q| text.contains(c_q)) {
            score = score.max(0.15); // Fixed low score for this weaker match type
        }
    }

    if score > 0.0 {
        // Cap non-perfect matches slightly below 1.0 to make perfect (1.0) distinct.
        Some(score.min(0.95))
    } else {
        None
    }
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
        user_args.insert("other_param".to_string(), Json::String("value".to_string()));
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
        user_args.insert("other_param".to_string(), Json::String("value".to_string()));
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
        user_args.insert("query".to_string(), Json::String("python".to_string()));
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

    // Helper function for approximate floating point comparison
    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-10
    }

    #[test]
    fn test_empty_strings() {
        assert_eq!(calculate_text_similarity("", "text"), None);
        assert_eq!(calculate_text_similarity("query", ""), None);
        assert_eq!(calculate_text_similarity("", ""), None);
    }

    #[test]
    fn test_perfect_match() {
        assert_eq!(calculate_text_similarity("text", "text"), Some(1.0));
        assert_eq!(calculate_text_similarity("a", "a"), Some(1.0));
    }

    #[test]
    fn test_prefix_match() {
        // For "te" and "text":
        // score = 0.5 + 0.4 * (2/4) = 0.5 + 0.2 = 0.7
        let score = calculate_text_similarity("te", "text").unwrap();
        assert!(approx_eq(score, 0.7));

        // For "tex" and "text":
        // score = 0.5 + 0.4 * (3/4) = 0.5 + 0.3 = 0.8
        let score = calculate_text_similarity("tex", "text").unwrap();
        assert!(approx_eq(score, 0.8));
    }

    #[test]
    fn test_substring_match() {
        // For "ex" and "text":
        // score = 0.3 + 0.3 * (2/4) = 0.3 + 0.15 = 0.45
        let score = calculate_text_similarity("ex", "text").unwrap();
        assert!(approx_eq(score, 0.45));

        // Prefix should score higher than substring
        assert!(
            calculate_text_similarity("te", "text").unwrap()
                > calculate_text_similarity("ex", "text").unwrap()
        );
    }

    #[test]
    fn test_character_presence() {
        // Characters present but not in sequence
        // "tac" in "contact" - not a substring, but all chars exist
        let score = calculate_text_similarity("tac", "contact").unwrap();
        assert!(approx_eq(0.3 + 0.3 * (3.0 / 7.0), score));

        assert!(calculate_text_similarity("ac", "contact").is_some());

        // Should not apply if some characters are missing
        assert_eq!(calculate_text_similarity("xyz", "contact"), None);
    }

    #[test]
    fn test_combined_scenarios() {
        // Test that character presence fallback doesn't override higher scores
        // "tex" is a prefix of "text" with score 0.8
        let score = calculate_text_similarity("tex", "text").unwrap();
        assert!(approx_eq(score, 0.8));

        // Test a case where the characters exist but it's already a substring
        // "act" is a substring of "contact" with score > 0.2, so fallback won't apply
        let expected_score = 0.3 + 0.3 * (3.0 / 7.0);
        let actual_score = calculate_text_similarity("act", "contact").unwrap();
        assert!(approx_eq(actual_score, expected_score));
    }

    #[test]
    fn test_no_similarity() {
        assert_eq!(calculate_text_similarity("xyz", "test"), None);
    }

    #[test]
    fn test_score_capping() {
        // Use a long query that's a prefix of a slightly longer text
        let long_text = "abcdefghijklmnopqrstuvwxyz";
        let long_prefix = "abcdefghijklmnopqrstuvwxy"; // All but last letter

        // Expected score would be 0.5 + 0.4 * (25/26) = 0.5 + 0.385 = 0.885
        let expected_score = 0.5 + 0.4 * (25.0 / 26.0);
        let actual_score = calculate_text_similarity(long_prefix, long_text).unwrap();
        assert!(approx_eq(actual_score, expected_score));

        // Verify that non-perfect matches are capped at 0.95
        assert!(calculate_text_similarity("almost", "almost perfect").unwrap() <= 0.95);
    }

    #[test]
    fn test_filesystem_access_serialize_empty() {
        let access = FileSystemAccess::empty();
        let serialized = serde_json::to_string(&access).unwrap();
        assert_eq!(serialized, "[]");
    }

    #[test]
    fn test_filesystem_access_serialize_read_only() {
        let access = FileSystemAccess::READ;
        let serialized = serde_json::to_string(&access).unwrap();
        assert_eq!(serialized, r#"["read"]"#);
    }

    #[test]
    fn test_filesystem_access_serialize_write_only() {
        let access = FileSystemAccess::WRITE;
        let serialized = serde_json::to_string(&access).unwrap();
        assert_eq!(serialized, r#"["write"]"#);
    }

    #[test]
    fn test_filesystem_access_serialize_read_write() {
        let access = FileSystemAccess::READ | FileSystemAccess::WRITE;
        let serialized = serde_json::to_string(&access).unwrap();
        // The order should be consistent based on our implementation (read first, then write)
        assert_eq!(serialized, r#"["read","write"]"#);
    }

    #[test]
    fn test_filesystem_access_deserialize_empty() {
        let json = "[]";
        let access: FileSystemAccess = serde_json::from_str(json).unwrap();
        assert_eq!(access, FileSystemAccess::empty());
        assert!(!access.contains(FileSystemAccess::READ));
        assert!(!access.contains(FileSystemAccess::WRITE));
    }

    #[test]
    fn test_filesystem_access_deserialize_read_only() {
        let json = r#"["read"]"#;
        let access: FileSystemAccess = serde_json::from_str(json).unwrap();
        assert_eq!(access, FileSystemAccess::READ);
        assert!(access.contains(FileSystemAccess::READ));
        assert!(!access.contains(FileSystemAccess::WRITE));
    }

    #[test]
    fn test_filesystem_access_deserialize_write_only() {
        let json = r#"["write"]"#;
        let access: FileSystemAccess = serde_json::from_str(json).unwrap();
        assert_eq!(access, FileSystemAccess::WRITE);
        assert!(!access.contains(FileSystemAccess::READ));
        assert!(access.contains(FileSystemAccess::WRITE));
    }

    #[test]
    fn test_filesystem_access_deserialize_read_write() {
        let json = r#"["read", "write"]"#;
        let access: FileSystemAccess = serde_json::from_str(json).unwrap();
        assert_eq!(access, FileSystemAccess::READ | FileSystemAccess::WRITE);
        assert!(access.contains(FileSystemAccess::READ));
        assert!(access.contains(FileSystemAccess::WRITE));
    }

    #[test]
    fn test_filesystem_access_deserialize_write_read_order() {
        // Test that order doesn't matter during deserialization
        let json = r#"["write", "read"]"#;
        let access: FileSystemAccess = serde_json::from_str(json).unwrap();
        assert_eq!(access, FileSystemAccess::READ | FileSystemAccess::WRITE);
        assert!(access.contains(FileSystemAccess::READ));
        assert!(access.contains(FileSystemAccess::WRITE));
    }

    #[test]
    fn test_filesystem_access_deserialize_duplicate_values() {
        // Test that duplicate values don't cause issues
        let json = r#"["read", "read", "write"]"#;
        let access: FileSystemAccess = serde_json::from_str(json).unwrap();
        assert_eq!(access, FileSystemAccess::READ | FileSystemAccess::WRITE);
        assert!(access.contains(FileSystemAccess::READ));
        assert!(access.contains(FileSystemAccess::WRITE));
    }

    #[test]
    fn test_filesystem_access_deserialize_invalid_value() {
        let json = r#"["invalid"]"#;
        let result: Result<FileSystemAccess, _> = serde_json::from_str(json);
        assert!(result.is_err());

        let error_msg = result.unwrap_err().to_string();
        assert!(error_msg.contains("invalid"));
        assert!(error_msg.contains("read") && error_msg.contains("write"));
    }

    #[test]
    fn test_filesystem_access_deserialize_mixed_valid_invalid() {
        let json = r#"["read", "invalid", "write"]"#;
        let result: Result<FileSystemAccess, _> = serde_json::from_str(json);
        assert!(result.is_err());

        let error_msg = result.unwrap_err().to_string();
        assert!(error_msg.contains("invalid"));
    }

    #[test]
    fn test_filesystem_access_round_trip_empty() {
        let original = FileSystemAccess::empty();
        let serialized = serde_json::to_string(&original).unwrap();
        let deserialized: FileSystemAccess = serde_json::from_str(&serialized).unwrap();
        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_filesystem_access_round_trip_read() {
        let original = FileSystemAccess::READ;
        let serialized = serde_json::to_string(&original).unwrap();
        let deserialized: FileSystemAccess = serde_json::from_str(&serialized).unwrap();
        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_filesystem_access_round_trip_write() {
        let original = FileSystemAccess::WRITE;
        let serialized = serde_json::to_string(&original).unwrap();
        let deserialized: FileSystemAccess = serde_json::from_str(&serialized).unwrap();
        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_filesystem_access_round_trip_read_write() {
        let original = FileSystemAccess::READ | FileSystemAccess::WRITE;
        let serialized = serde_json::to_string(&original).unwrap();
        let deserialized: FileSystemAccess = serde_json::from_str(&serialized).unwrap();
        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_serialize_coco_semver_none() {
        let version: Option<SemVer> = None;
        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_coco_semver(&version, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(serialized, "null");
    }

    #[test]
    fn test_serialize_coco_semver_simple() {
        let version: Option<SemVer> = Some(SemVer::parse("1.2.3").unwrap());
        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_coco_semver(&version, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(serialized, "\"1.2.3\"");
    }

    #[test]
    fn test_serialize_coco_semver_with_pre() {
        let version: Option<SemVer> = Some(SemVer::parse("1.2.3-SNAPSHOT.1234").unwrap());
        let mut serializer = serde_json::Serializer::new(Vec::new());
        serialize_coco_semver(&version, &mut serializer).unwrap();
        let serialized = String::from_utf8(serializer.into_inner()).unwrap();
        assert_eq!(serialized, "\"1.2.3-SNAPSHOT-1234\"");
    }
}
