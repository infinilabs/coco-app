use crate::extension::third_party::{
    THIRD_PARTY_EXTENSIONS_DIRECTORY, THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE,
};
use crate::extension::PLUGIN_JSON_FILE_NAME;
use crate::extension::{canonicalize_relative_icon_path, Extension};
use serde_json::Value as Json;
use std::path::Path;
use std::path::PathBuf;
use tokio::fs;

/// All the extensions installed from local file will belong to a special developer
/// "local".
const DEVELOPER_ID_LOCAL: &str = "local";

/// Install the extension specified by `path`.
///
/// `path` should point to a directory with the following structure:
///
/// ```text
/// extension-directory/
/// ├── assets/
/// │   ├── icon.png
/// │   └── other-assets...
/// └── plugin.json
/// ```
#[tauri::command]
pub(crate) async fn install_local_extension(path: PathBuf) -> Result<(), String> {
    // Get the extension directory name
    let extension_dir_name = path
        .file_name()
        .ok_or_else(|| "Invalid extension: no directory name".to_string())?
        .to_str()
        .ok_or_else(|| "Invalid extension: non-UTF8 extension id".to_string())?;

    // Read plugin.json file
    let plugin_json_path = path.join(PLUGIN_JSON_FILE_NAME);
    let plugin_json_content = fs::read_to_string(&plugin_json_path)
        .await
        .map_err(|e| e.to_string())?;

    // Parse as JSON first
    let mut extension_json: Json =
        serde_json::from_str(&plugin_json_content).map_err(|e| e.to_string())?;

    // Set the main extension ID to the directory name
    let extension_obj = extension_json
        .as_object_mut()
        .expect("extension_json should be an object");

    extension_obj.insert(
        "id".to_string(),
        Json::String(extension_dir_name.to_string()),
    );
    extension_obj.insert(
        "developer".to_string(),
        Json::String(DEVELOPER_ID_LOCAL.to_string()),
    );

    // Counter for sub-extension IDs
    let mut counter = 1u32;

    // Set IDs for commands
    if let Some(commands) = extension_obj.get_mut("commands") {
        if let Some(commands_array) = commands.as_array_mut() {
            for command in commands_array {
                if let Some(command_obj) = command.as_object_mut() {
                    command_obj.insert("id".to_string(), Json::String(counter.to_string()));
                    counter += 1;
                }
            }
        }
    }

    // Set IDs for quicklinks
    if let Some(quicklinks) = extension_obj.get_mut("quicklinks") {
        if let Some(quicklinks_array) = quicklinks.as_array_mut() {
            for quicklink in quicklinks_array {
                if let Some(quicklink_obj) = quicklink.as_object_mut() {
                    quicklink_obj.insert("id".to_string(), Json::String(counter.to_string()));
                    counter += 1;
                }
            }
        }
    }

    // Set IDs for scripts
    if let Some(scripts) = extension_obj.get_mut("scripts") {
        if let Some(scripts_array) = scripts.as_array_mut() {
            for script in scripts_array {
                if let Some(script_obj) = script.as_object_mut() {
                    script_obj.insert("id".to_string(), Json::String(counter.to_string()));
                    counter += 1;
                }
            }
        }
    }

    // Now deserialize to Extension struct
    let mut extension: Extension =
        serde_json::from_value(extension_json).map_err(|e| e.to_string())?;

    // Create destination directory
    let dest_dir = THIRD_PARTY_EXTENSIONS_DIRECTORY
        .join(DEVELOPER_ID_LOCAL)
        .join(extension_dir_name);

    fs::create_dir_all(&dest_dir)
        .await
        .map_err(|e| e.to_string())?;

    // Copy all files except plugin.json
    let mut entries = fs::read_dir(&path).await.map_err(|e| e.to_string())?;

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let file_name = entry.file_name();
        let file_name_str = file_name
            .to_str()
            .ok_or_else(|| "Invalid filename: non-UTF8".to_string())?;

        if file_name_str == PLUGIN_JSON_FILE_NAME {
            continue;
        }

        let src_path = entry.path();
        let dest_path = dest_dir.join(&file_name);

        if src_path.is_dir() {
            // Recursively copy directory
            copy_dir_recursively_sync(&src_path, &dest_path)?;
        } else {
            // Copy file
            fs::copy(&src_path, &dest_path)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    // Write the corrected plugin.json file
    let corrected_plugin_json =
        serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?;

    let dest_plugin_json_path = dest_dir.join(PLUGIN_JSON_FILE_NAME);
    fs::write(&dest_plugin_json_path, corrected_plugin_json)
        .await
        .map_err(|e| e.to_string())?;

    // Canonicalize relative icon paths
    canonicalize_relative_icon_path(&dest_dir, &mut extension)?;

    // Add extension to the search source
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .add_extension(extension)
        .await;

    Ok(())
}

/// Helper function to recursively copy directories using std::fs (blocking)
fn copy_dir_recursively_sync(src: &Path, dest: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;

    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursively_sync(&src_path, &dest_path)?;
        } else {
            std::fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
