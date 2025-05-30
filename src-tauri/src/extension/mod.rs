pub(crate) mod built_in;
mod third_party;

use crate::common::document::OnOpened;
use crate::{common::register::SearchSourceRegistry, GLOBAL_TAURI_APP_HANDLE};
use anyhow::Context;
use derive_more::Display;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as Json;
use std::collections::HashSet;
use std::ffi::OsStr;
use std::path::Path;
use tauri::Manager;
use third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub const LOCAL_QUERY_SOURCE_TYPE: &str = "local";
const PLUGIN_JSON_FILE_NAME: &str = "plugin.json";
const ASSETS_DIRECTORY_FILE_NAME: &str = "assets";

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

/// Helper function to determine the current platform.
fn current_platform() -> Platform {
    let os_str = std::env::consts::OS;
    serde_plain::from_str(os_str).unwrap_or_else(|_e| {
      panic!("std::env::consts::OS is [{}], which is not a valid value for [enum Platform], valid values: ['macos', 'linux', 'windows']", os_str)
    })
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Extension {
    /// Unique extension identifier.
    id: String,
    /// Extension name.
    title: String,
    /// Platforms supported by this extension.
    ///
    /// If `None`, then this extension can be used on all the platforms.
    #[serde(skip_serializing_if = "Option::is_none")]
    platforms: Option<HashSet<Platform>>,
    /// Extension description.
    description: String,
    //// Specify the icon for this extension, multi options are available:
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
    icon: String,
    r#type: ExtensionType,
    /// If this is a Command extension, then action defines the operation to execute
    /// when the it is triggered.
    #[serde(skip_serializing_if = "Option::is_none")]
    action: Option<CommandAction>,
    /// The link to open if this is a QuickLink extension.
    #[serde(skip_serializing_if = "Option::is_none")]
    quick_link: Option<QuickLink>,

    // If this extension is of type Group or Extension, then it behaves like a
    // directory, i.e., it could contain sub items.
    commands: Option<Vec<Extension>>,
    scripts: Option<Vec<Extension>>,
    quick_links: Option<Vec<Extension>>,

    /// The alias of the extension.
    ///
    /// Extension of type Group and Extension cannot have alias.
    ///
    #[serde(skip_serializing_if = "Option::is_none")]
    alias: Option<String>,
    /// The hotkey of the extension.
    ///
    /// Extension of type Group and Extension cannot have hotkey.
    #[serde(skip_serializing_if = "Option::is_none")]
    hotkey: Option<String>,

    /// Is this extension enabled.
    enabled: bool,

    /// Extension settings
    #[serde(skip_serializing_if = "Option::is_none")]
    settings: Option<Json>,
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

    /// Perform `how` against the extension specified by `extension_id`.
    ///
    /// Please note that `extension_id` could point to a sub extension.
    pub(crate) fn modify(
        &mut self,
        extension_id: &str,
        how: impl FnOnce(&mut Self) -> Result<(), String>,
    ) -> Result<(), String> {
        let (parent_extension_id, opt_sub_extension_id) = split_extension_id(extension_id);
        assert_eq!(
            parent_extension_id, self.id,
            "modify() should be invoked against a parent extension"
        );

        let Some(sub_extension_id) = opt_sub_extension_id else {
            how(self)?;
            return Ok(());
        };

        // Search in commands
        if let Some(ref mut commands) = self.commands {
            if let Some(command) = commands.iter_mut().find(|cmd| cmd.id == sub_extension_id) {
                how(command)?;
                return Ok(());
            }
        }

        // Search in scripts
        if let Some(ref mut scripts) = self.scripts {
            if let Some(script) = scripts.iter_mut().find(|scr| scr.id == sub_extension_id) {
                how(script)?;
                return Ok(());
            }
        }

        // Search in quick_links
        if let Some(ref mut quick_links) = self.quick_links {
            if let Some(link) = quick_links
                .iter_mut()
                .find(|lnk| lnk.id == sub_extension_id)
            {
                how(link)?;
                return Ok(());
            }
        }

        Err(format!(
            "extension [{}] not found in {:?}",
            extension_id, self
        ))
    }

    /// Get the extension specified by `extension_id`.
    ///
    /// Please note that `extension_id` could point to a sub extension.
    pub(crate) fn get_extension_mut(&mut self, extension_id: &str) -> Option<&mut Self> {
        let (parent_extension_id, opt_sub_extension_id) = split_extension_id(extension_id);
        if parent_extension_id != self.id {
            return None;
        }

        let Some(sub_extension_id) = opt_sub_extension_id else {
            return Some(self);
        };

        self.get_sub_extension_mut(sub_extension_id)
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
        if let Some(ref mut quick_links) = self.quick_links {
            if let Some(sub_ext) = quick_links
                .iter_mut()
                .find(|link| link.id == sub_extension_id)
            {
                return Some(sub_ext);
            }
        }

        None
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub(crate) struct CommandAction {
    pub(crate) exec: String,
    pub(crate) args: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct QuickLink {
    link: String,
}

#[derive(Debug, PartialEq, Deserialize, Serialize, Clone, Display)]
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

fn canonicalize_relative_icon_path(
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

    if let Some(quick_links) = &mut extension.quick_links {
        for quick_link in quick_links {
            _canonicalize_relative_icon_path(extension_dir, quick_link)?;
        }
    }

    Ok(())
}

fn list_extensions_under_directory(directory: &Path) -> Result<(bool, Vec<Extension>), String> {
    let mut found_invalid_extensions = false;

    let extension_directory = std::fs::read_dir(&directory).map_err(|e| e.to_string())?;
    let current_platform = current_platform();

    let mut extensions = Vec::new();
    for res_extension_dir in extension_directory {
        let extension_dir = res_extension_dir.map_err(|e| e.to_string())?;
        let file_type = extension_dir.file_type().map_err(|e| e.to_string())?;
        if !file_type.is_dir() {
            found_invalid_extensions = true;
            log::warn!(
                "invalid extension [{}]: a valid extension should be a directory, but it is not",
                extension_dir.file_name().display()
            );

            // Skip invalid extension
            continue;
        }

        let plugin_json_file_path = {
            let mut path = extension_dir.path();
            path.push(PLUGIN_JSON_FILE_NAME);

            path
        };

        if !plugin_json_file_path.is_file() {
            found_invalid_extensions = true;
            log::warn!(
                "invalid extension: [{}]: extension file [{}] should be a JSON file, but it is not",
                extension_dir.file_name().display(),
                plugin_json_file_path.display()
            );

            // Skip invalid extension
            continue;
        }

        let mut extension = match serde_json::from_reader::<_, Extension>(
            std::fs::File::open(&plugin_json_file_path).map_err(|e| e.to_string())?,
        ) {
            Ok(extension) => extension,
            Err(e) => {
                found_invalid_extensions = true;
                log::warn!(
                    "invalid extension: [{}]: extension file [{}] is invalid, error: '{}'",
                    extension_dir.file_name().display(),
                    plugin_json_file_path.display(),
                    e
                );
                continue;
            }
        };

        // Turn it into an absolute path if it is a valid relative path because frontend code need this.
        canonicalize_relative_icon_path(&extension_dir.path(), &mut extension)?;

        if !validate_extension(
            &extension,
            &extension_dir.file_name(),
            &extensions,
            current_platform,
        ) {
            found_invalid_extensions = true;
            // Skip invalid extension
            continue;
        }

        extensions.push(extension);
    }

    log::debug!(
        "loaded extensions: {:?}",
        extensions
            .iter()
            .map(|ext| ext.id.as_str())
            .collect::<Vec<_>>()
    );

    Ok((found_invalid_extensions, extensions))
}

/// Return value:
///
/// * boolean: indicates if we found any invalid extensions
/// * Vec<Extension>: loaded extensions
#[tauri::command]
pub(crate) async fn list_extensions() -> Result<(bool, Vec<Extension>), String> {
    log::trace!("loading extensions");

    let third_party_dir = third_party::THIRD_PARTY_EXTENSION_DIRECTORY.as_path();
    if !third_party_dir.try_exists().map_err(|e| e.to_string())? {
        tokio::fs::create_dir_all(third_party_dir)
            .await
            .map_err(|e| e.to_string())?;
    }
    let (third_party_found_invalid_extension, mut third_party_extensions) =
        list_extensions_under_directory(third_party_dir)?;

    let built_in_dir = built_in::BUILT_IN_EXTENSION_DIRECTORY.as_path();
    let (built_in_found_invalid_extension, built_in_extensions) =
        list_extensions_under_directory(built_in_dir)?;

    let found_invalid_extension =
        third_party_found_invalid_extension || built_in_found_invalid_extension;
    let extensions = {
        third_party_extensions.extend(built_in_extensions);

        third_party_extensions
    };

    Ok((found_invalid_extension, extensions))
}

/// Helper function to validate `extension`, return `true` if it is valid.
fn validate_extension(
    extension: &Extension,
    extension_dir_name: &OsStr,
    listed_extensions: &[Extension],
    current_platform: Platform,
) -> bool {
    if OsStr::new(&extension.id) != extension_dir_name {
        log::warn!(
            "invalid extension []: id [{}] and extension directory name [{}] do not match",
            extension.id,
            extension_dir_name.display()
        );
        return false;
    }

    // Extension ID should be unique
    if listed_extensions.iter().any(|ext| ext.id == extension.id) {
        log::warn!(
            "invalid extension []: extension with id [{}] already exists",
            extension.id,
        );
        return false;
    }

    if !validate_extension_or_sub_item(extension) {
        return false;
    }

    // Extension is incompatible
    if let Some(ref platforms) = extension.platforms {
        if !platforms.contains(&current_platform) {
            log::warn!("extension [{}] is not compatible with the current platform [{}], it is available to {:?}", extension.id, current_platform, platforms.iter().map(|os|os.to_string()).collect::<Vec<_>>());
            return false;
        }
    }

    if let Some(ref commands) = extension.commands {
        if !validate_sub_items(&extension.id, commands) {
            return false;
        }
    }

    if let Some(ref scripts) = extension.scripts {
        if !validate_sub_items(&extension.id, scripts) {
            return false;
        }
    }

    if let Some(ref quick_links) = extension.quick_links {
        if !validate_sub_items(&extension.id, quick_links) {
            return false;
        }
    }

    true
}

/// Checks that can be performed against an extension or a sub item.
fn validate_extension_or_sub_item(extension: &Extension) -> bool {
    // Only
    //
    // 1. letters
    // 2. hyphens
    // 3. numbers
    //
    // are allowed in the ID.
    if !extension
        .id
        .chars()
        .all(|c| c.is_ascii_alphabetic() || c == '-')
    {
        log::warn!(
            "invalid extension [{}], [id] should contain only letters, numbers, or hyphens",
            extension.id
        );
        return false;
    }

    // If field `action` is Some, then it should be a Command
    if extension.action.is_some() && extension.r#type != ExtensionType::Command {
        log::warn!(
            "invalid extension [{}], [action] is set for a non-Command extension",
            extension.id
        );
        return false;
    }

    if extension.r#type == ExtensionType::Command && extension.action.is_none() {
        log::warn!(
            "invalid extension [{}], [action] should be set for a Command extension",
            extension.id
        );
        return false;
    }

    // If field `quick_link` is Some, then it should be a QuickLink
    if extension.quick_link.is_some() && extension.r#type != ExtensionType::Quicklink {
        log::warn!(
            "invalid extension [{}], [quick_link] is set for a non-QuickLink extension",
            extension.id
        );
        return false;
    }

    if extension.r#type == ExtensionType::Quicklink && extension.quick_link.is_none() {
        log::warn!(
            "invalid extension [{}], [quick_link] should be set for a QuickLink extension",
            extension.id
        );
        return false;
    }

    // Group and Extension cannot have alias
    if extension.alias.is_some() {
        if extension.r#type == ExtensionType::Group || extension.r#type == ExtensionType::Extension
        {
            log::warn!(
                "invalid extension [{}], extension of type [{:?}] cannot have alias",
                extension.id,
                extension.r#type
            );
            return false;
        }
    }

    // Group and Extension cannot have hotkey
    if extension.hotkey.is_some() {
        if extension.r#type == ExtensionType::Group || extension.r#type == ExtensionType::Extension
        {
            log::warn!(
                "invalid extension [{}], extension of type [{:?}] cannot have hotkey",
                extension.id,
                extension.r#type
            );
            return false;
        }
    }

    if extension.commands.is_some()
        || extension.scripts.is_some()
        || extension.quick_links.is_some()
    {
        if extension.r#type != ExtensionType::Group && extension.r#type != ExtensionType::Extension
        {
            log::warn!(
                "invalid extension [{}], only extension of type [Group] and [Extension] can have sub-items",
                extension.id,
            );
            return false;
        }
    }

    true
}

/// Helper function to check sub-items.
fn validate_sub_items(extension_id: &str, sub_items: &[Extension]) -> bool {
    for (sub_item_index, sub_item) in sub_items.iter().enumerate() {
        // If field `action` is Some, then it should be a Command
        if sub_item.action.is_some() && sub_item.r#type != ExtensionType::Command {
            log::warn!(
                "invalid extension sub-item [{}-{}]: [action] is set for a non-Command extension",
                extension_id,
                sub_item.id
            );
            return false;
        }

        if sub_item.r#type == ExtensionType::Group || sub_item.r#type == ExtensionType::Extension {
            log::warn!(
                "invalid extension sub-item [{}-{}]: sub-item should not be of type [Group] or [Extension]",
                extension_id, sub_item.id
            );
            return false;
        }

        let sub_item_with_same_id_count = sub_items
            .iter()
            .enumerate()
            .filter(|(_idx, ext)| ext.id == sub_item.id)
            .filter(|(idx, _ext)| *idx != sub_item_index)
            .count();
        if sub_item_with_same_id_count != 0 {
            log::warn!(
                "invalid extension [{}]: found more than one sub-items with the same ID [{}]",
                extension_id,
                sub_item.id
            );
            return false;
        }

        if !validate_extension_or_sub_item(sub_item) {
            return false;
        }

        if sub_item.platforms.is_some() {
            log::warn!(
                "invalid extension [{}]: key [platforms] should not be set in sub-items",
                extension_id,
            );
            return false;
        }
    }

    true
}

pub(crate) async fn init_extensions(mut extensions: Vec<Extension>) -> Result<(), String> {
    log::trace!("initializing extensions");

    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    built_in::application::ApplicationSearchSource::init(tauri_app_handle.clone()).await?;

    // Init the built-in enabled extensions
    for built_in_extension in extensions
        .extract_if(.., |ext| built_in::is_extension_built_in(&ext.id))
        .filter(|ext| ext.enabled)
    {
        built_in::init_built_in_extension(&built_in_extension, &search_source_registry_tauri_state)
            .await;
    }

    // Now the third-party extensions
    let third_party_search_source = third_party::ThirdPartyExtensionsSearchSource::new(extensions);
    third_party_search_source
        .restore_extensions_hotkey()
        .await?;
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
pub(crate) async fn enable_extension(extension_id: String) -> Result<(), String> {
    println!("enable_extension: {}", extension_id);

    if built_in::is_extension_built_in(&extension_id) {
        built_in::enable_built_in_extension(&extension_id).await?;
        return Ok(());
    }

    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").enable_extension(&extension_id).await
}

#[tauri::command]
pub(crate) async fn disable_extension(extension_id: String) -> Result<(), String> {
    println!("disable_extension: {}", extension_id);

    if built_in::is_extension_built_in(&extension_id) {
        built_in::disable_built_in_extension(&extension_id).await?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").disable_extension(&extension_id).await
}

#[tauri::command]
pub(crate) async fn set_extension_alias(extension_id: String, alias: String) -> Result<(), String> {
    if built_in::is_extension_built_in(&extension_id) {
        built_in::set_built_in_extension_alias(&extension_id, &alias);
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").set_extension_alias(&extension_id, &alias).await
}

#[tauri::command]
pub(crate) async fn register_extension_hotkey(
    extension_id: String,
    hotkey: String,
) -> Result<(), String> {
    println!("register_extension_hotkey: {}, {}", extension_id, hotkey);

    if built_in::is_extension_built_in(&extension_id) {
        built_in::register_built_in_extension_hotkey(&extension_id, &hotkey)?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").register_extension_hotkey(&extension_id, &hotkey).await
}

/// NOTE: this function won't error out if the extension specified by `extension_id`
/// has no hotkey set because we need it to behave like this.
#[tauri::command]
pub(crate) async fn unregister_extension_hotkey(extension_id: String) -> Result<(), String> {
    if built_in::is_extension_built_in(&extension_id) {
        built_in::unregister_built_in_extension_hotkey(&extension_id)?;
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").unregister_extension_hotkey(&extension_id).await?;

    Ok(())
}

#[tauri::command]
pub(crate) async fn is_extension_enabled(extension_id: String) -> Result<bool, String> {
    if built_in::is_extension_built_in(&extension_id) {
        return built_in::is_built_in_extension_enabled(&extension_id).await;
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").is_extension_enabled(&extension_id).await
}

fn split_extension_id(extension_id: &str) -> (&str, Option<&str>) {
    match extension_id.find('.') {
        Some(idx) => (&extension_id[..idx], Some(&extension_id[idx + 1..])),
        None => (extension_id, None),
    }
}

fn load_extension_from_json_file(
    extension_directory: &Path,
    extension_id: &str,
) -> Result<Extension, String> {
    let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);
    let json_file_path = {
        let mut extension_directory_path = extension_directory.join(parent_extension_id);
        extension_directory_path.push(PLUGIN_JSON_FILE_NAME);

        extension_directory_path
    };

    let mut extension = serde_json::from_reader::<_, Extension>(
        std::fs::File::open(&json_file_path)
            .with_context(|| {
                format!(
                    "the [{}] file for extension [{}] is missing or broken",
                    PLUGIN_JSON_FILE_NAME, parent_extension_id
                )
            })
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    canonicalize_relative_icon_path(extension_directory, &mut extension)?;

    Ok(extension)
}

fn alter_extension_json_file(
    extension_directory: &Path,
    extension_id: &str,
    how: impl Fn(&mut Extension) -> Result<(), String>,
) -> Result<(), String> {
    log::debug!(
        "altering extension JSON file for extension [{}]",
        extension_id
    );

    let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);
    let json_file_path = {
        let mut extension_directory_path = extension_directory.join(parent_extension_id);
        extension_directory_path.push(PLUGIN_JSON_FILE_NAME);

        extension_directory_path
    };

    let mut extension = serde_json::from_reader::<_, Extension>(
        std::fs::File::open(&json_file_path)
            .with_context(|| {
                format!(
                    "the [{}] file for extension [{}] is missing or broken",
                    PLUGIN_JSON_FILE_NAME, parent_extension_id
                )
            })
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    extension.modify(extension_id, how)?;

    std::fs::write(
        &json_file_path,
        serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
