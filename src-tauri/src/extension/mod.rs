pub(crate) mod built_in;
mod third_party;

use crate::{common::register::SearchSourceRegistry, GLOBAL_TAURI_APP_HANDLE};
use anyhow::Context;
use derive_more::Display;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as Json;
use std::collections::HashSet;
use std::error::Error;
use std::ffi::OsStr;
use std::path::PathBuf;
use std::sync::LazyLock;
use tauri::Manager;
use tauri_plugin_global_shortcut::Shortcut;
use third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub const LOCAL_QUERY_SOURCE_TYPE: &str = "local";
const PLUGIN_JSON_FILE_NAME: &str = "plugin.json";

static EXTENSION_DIRECTORY: LazyLock<PathBuf> = LazyLock::new(|| {
    let mut app_data_dir = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set")
        .path()
        .app_data_dir()
        .expect(
            "User home directory not found, which should be impossible on desktop environments",
        );
    app_data_dir.push("extension");

    app_data_dir
});

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
    platforms: Option<HashSet<Platform>>,
    /// Extension description.
    description: String,
    /// Path to the icon of the extension.
    ///
    /// For built-in extensions, this field records their icon ID rather than path.
    icon: String,
    r#type: ExtensionType,
    /// If this is a Command extension, then action defines the operation to execute
    /// when the it is triggered.
    action: Option<CommandAction>,
    /// The link to open if this is a QuickLink extension.
    quick_link: Option<QuickLink>,

    // If this extension is of type Group or Extension, then it behaves like a
    // directory, i.e., it could contain sub items.
    commands: Option<Vec<Extension>>,
    scripts: Option<Vec<Extension>>,
    quick_links: Option<Vec<Extension>>,

    /// The alias of the extension.
    ///
    /// If empty, this extension cannot have an alias.
    ///
    /// Extension of type Group and Extension cannot have alias.
    alias: Option<String>,
    /// The hotkey of the extension.
    ///
    /// If empty, this extension cannot have an hotkey.
    ///
    /// Extension of type Group and Extension cannot have hotkey.
    hotkey: Option<Shortcut>,

    /// Is this extension enabled.
    enabled: bool,

    /// Extension settings
    settings: Option<Json>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CommandAction {
    exec: String,
    args: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct QuickLink {
    link: String,
}

#[derive(Debug, PartialEq, Deserialize, Serialize, Clone)]
#[serde(rename_all(serialize = "snake_case", deserialize = "snake_case"))]
pub enum ExtensionType {
    Group,
    Extension,
    Command,
    Application,
    Script,
    QuickLink,
    Setting,
}

/// Return value:
///
/// * boolean: indicates if we found any invalid extensions
/// * Vec<Extension>: loaded extensions
pub(crate) fn list_extensions() -> Result<(bool, Vec<Extension>), Box<dyn Error>> {
    log::trace!("loading extensions");

    let mut found_invalid_extensions = false;

    let extension_directory_path = EXTENSION_DIRECTORY.as_path();
    let extension_directory = std::fs::read_dir(&extension_directory_path)?;
    let current_platform = current_platform();

    let mut extensions = Vec::new();
    for res_extension_dir in extension_directory {
        let extension_dir = res_extension_dir?;
        let file_type = extension_dir.file_type()?;
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

        let extension = match serde_json::from_reader::<_, Extension>(std::fs::File::open(
            &plugin_json_file_path,
        )?) {
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
    if extension.quick_link.is_some() && extension.r#type != ExtensionType::QuickLink {
        log::warn!(
            "invalid extension [{}], [quick_link] is set for a non-QuickLink extension",
            extension.id
        );
        return false;
    }

    if extension.r#type == ExtensionType::QuickLink && extension.quick_link.is_none() {
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

fn flatten_extensions(extensions: Vec<Extension>) -> Vec<Extension> {
    /// Helper function that does the actual work.
    fn _flatten_extensions(
        flattened_extensions: &mut Vec<Extension>,
        parent_id: Option<&str>,
        extensions: Vec<Extension>,
    ) {
        for mut extension in extensions {
            if extension.r#type == ExtensionType::Group
                || extension.r#type == ExtensionType::Extension
            {
                if let Some(commands) = extension.commands {
                    _flatten_extensions(flattened_extensions, Some(&extension.id), commands);
                }

                if let Some(scripts) = extension.scripts {
                    _flatten_extensions(flattened_extensions, Some(&extension.id), scripts);
                }

                if let Some(quick_links) = extension.quick_links {
                    _flatten_extensions(flattened_extensions, Some(&extension.id), quick_links);
                }
            } else {
                // Update extension ID if needed
                if let Some(parent_id) = parent_id {
                    let new_id = format!("{}.{}", parent_id, extension.id);
                    extension.id = new_id;
                };

                flattened_extensions.push(extension);
            }
        }
    }

    let mut ret = Vec::with_capacity(extensions.len());
    _flatten_extensions(&mut ret, None, extensions);
    ret
}

pub(crate) fn init_extensions(mut extensions: Vec<Extension>) {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    // Filter out disabled extension
    extensions.retain(|ext| ext.enabled);

    // Init the built-in extensions
    for built_in_extension in
        extensions.extract_if(.., |ext| built_in::is_extension_built_in(&ext.id))
    {
        built_in::init_built_in_extension(&built_in_extension, &search_source_registry_tauri_state);
    }

    // Now the third-party extensions
    let extensions = flatten_extensions(extensions);
    let third_party_search_source = third_party::ThirdPartyExtensionsSearchSource::new(extensions);
    let third_party_search_source_clone = third_party_search_source.clone();
    // Set the global search source so that we can access it in `#[tauri::command]`s
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.set(third_party_search_source_clone);
    search_source_registry_tauri_state.register_source(third_party_search_source);
}

#[tauri::command]
pub(crate) async fn enable_extension(extension_id: String) -> Result<(), String> {
    if built_in::is_extension_built_in(&extension_id) {
        built_in::enable_built_in_extension(&extension_id);
        return Ok(());
    }

    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").enable_extension(&extension_id).await
}

#[tauri::command]
pub(crate) async fn disable_extension(extension_id: String) -> Result<(), String> {
    if built_in::is_extension_built_in(&extension_id) {
        built_in::disable_built_in_extension(&extension_id);
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
    if built_in::is_extension_built_in(&extension_id) {
        built_in::register_built_in_extension_hotkey(&extension_id, &hotkey);
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").register_extension_hotkey(&extension_id, &hotkey).await
}

#[tauri::command]
pub(crate) async fn unregister_extension_hotkey(extension_id: String) -> Result<(), String> {
    if built_in::is_extension_built_in(&extension_id) {
        built_in::unregister_built_in_extension_hotkey(&extension_id);
        return Ok(());
    }
    third_party::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE.get().expect("global third party search source not set, looks like init_extensions() has not been executed").unregister_extension_hotkey(&extension_id).await
}

fn alter_extension_json_file(
    extension_id: &str,
    mut how: impl FnMut(&mut Extension),
) -> Result<(), String> {
    log::debug!(
        "altering extension JSON file for extension [{}]",
        extension_id
    );

    let (parent_extension_id, opt_sub_extension_id) = match extension_id.find('.') {
        Some(idx) => (&extension_id[..idx], Some(&extension_id[idx + 1..])),
        None => (extension_id, None),
    };
    let json_file_path = {
        let mut extension_directory_path = EXTENSION_DIRECTORY.join(parent_extension_id);
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

    let Some(sub_extension_id) = opt_sub_extension_id else {
        how(&mut extension);
        std::fs::write(
            &json_file_path,
            serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        return Ok(());
    };

    // Search in commands
    if let Some(ref mut commands) = extension.commands {
        if let Some(command) = commands.iter_mut().find(|cmd| cmd.id == sub_extension_id) {
            how(command);
            // Write the updated extension back to the file
            std::fs::write(
                &json_file_path,
                serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    // Search in scripts
    if let Some(ref mut scripts) = extension.scripts {
        if let Some(script) = scripts.iter_mut().find(|scr| scr.id == sub_extension_id) {
            how(script);
            // Write the updated extension back to the file
            std::fs::write(
                &json_file_path,
                serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    // Search in quick_links
    if let Some(ref mut quick_links) = extension.quick_links {
        if let Some(link) = quick_links
            .iter_mut()
            .find(|lnk| lnk.id == sub_extension_id)
        {
            how(link);
            // Write the updated extension back to the file
            std::fs::write(
                &json_file_path,
                serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    Ok(())
}
