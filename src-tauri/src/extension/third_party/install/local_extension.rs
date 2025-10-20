use crate::extension::PLUGIN_JSON_FILE_NAME;
use crate::extension::third_party::check::general_check;
use crate::extension::third_party::install::{
    filter_out_incompatible_sub_extensions, is_extension_installed, view_extension_convert_pages,
};
use crate::extension::third_party::{
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE, get_third_party_extension_directory,
};
use crate::extension::{
    Extension, canonicalize_relative_icon_path, canonicalize_relative_page_path,
};
use crate::util::platform::Platform;
use serde_json::Value as Json;
use std::path::Path;
use std::path::PathBuf;
use tauri::AppHandle;
use tokio::fs;

/// All the extensions installed from local file will belong to a special developer
/// "__local__".
const DEVELOPER_ID_LOCAL: &str = "__local__";

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
pub(crate) async fn install_local_extension(
    tauri_app_handle: AppHandle,
    path: PathBuf,
) -> Result<(), String> {
    let extension_dir_name = path
        .file_name()
        .ok_or_else(|| "Invalid extension: no directory name".to_string())?
        .to_str()
        .ok_or_else(|| "Invalid extension: non-UTF8 extension id".to_string())?;

    // we use extension directory name as the extension ID.
    let extension_id = extension_dir_name;
    if is_extension_installed(DEVELOPER_ID_LOCAL, extension_id).await {
        // The frontend code uses this string to distinguish between 2 error cases:
        //
        // 1. This extension is already imported
        // 2. This extension is incompatible with the current platform
        // 3. The selected directory does not contain a valid extension
        //
        // do NOT edit this without updating the frontend code.
        //
        // ```ts
        // if (errorMessage === "already imported") {
        //   addError(t("settings.extensions.hints.extensionAlreadyImported"));
        // } else if (errorMessage === "incompatible") {
        //   addError(t("settings.extensions.hints.incompatibleExtension"));
        // } else {
        //   addError(t("settings.extensions.hints.importFailed"));
        // }
        // ```
        //
        // This is definitely error-prone, but we have to do this until we have
        // structured error type
        return Err("already imported".into());
    }

    let plugin_json_path = path.join(PLUGIN_JSON_FILE_NAME);

    let plugin_json_content = fs::read_to_string(&plugin_json_path)
        .await
        .map_err(|e| e.to_string())?;

    // Parse as JSON first as it is not valid for `struct Extension`, we need to
    // correct it (set fields `id` and `developer`) before converting it to `struct Extension`:
    let mut extension_json: Json =
        serde_json::from_str(&plugin_json_content).map_err(|e| e.to_string())?;

    // Set the main extension ID to the directory name
    let extension_obj = extension_json
        .as_object_mut()
        .expect("extension_json should be an object");
    extension_obj.insert("id".to_string(), Json::String(extension_id.to_string()));
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

    // Now we can convert JSON to `struct Extension`
    let mut extension: Extension =
        serde_json::from_value(extension_json).map_err(|e| e.to_string())?;

    let current_platform = Platform::current();
    /* Check begins here */
    general_check(&extension)?;

    if let Some(ref platforms) = extension.platforms {
        if !platforms.contains(&current_platform) {
            // The frontend code uses this string to distinguish between 3 error cases:
            //
            // 1. This extension is already imported
            // 2. This extension is incompatible with the current platform
            // 3. The selected directory does not contain a valid extension
            //
            // do NOT edit this without updating the frontend code.
            //
            // ```ts
            // if (errorMessage === "already imported") {
            //   addError(t("settings.extensions.hints.extensionAlreadyImported"));
            // } else if (errorMessage === "incompatible") {
            //   addError(t("settings.extensions.hints.incompatibleExtension"));
            // } else {
            //   addError(t("settings.extensions.hints.importFailed"));
            // }
            // ```
            //
            // This is definitely error-prone, but we have to do this until we have
            // structured error type
            return Err("incompatible".into());
        }
    }
    /* Check ends here */

    // Extension is compatible with current platform, but it could contain sub
    // extensions that are not, filter them out.
    filter_out_incompatible_sub_extensions(&mut extension, current_platform);

    // We are going to modify our third-party extension list, grab the write lock
    // to ensure exclusive access.
    let mut third_party_ext_list_write_lock = THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .expect("global third party search source not set")
        .write_lock()
        .await;

    // Create destination directory
    let dest_dir = get_third_party_extension_directory(&tauri_app_handle)
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

        // plugin.json will be handled separately.
        if file_name_str == PLUGIN_JSON_FILE_NAME {
            continue;
        }

        let src_path = entry.path();
        let dest_path = dest_dir.join(&file_name);

        if src_path.is_dir() {
            // Recursively copy directory
            copy_dir_recursively(&src_path, &dest_path).await?;
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

    /*
     * Call convert_page() to update the page files.  This has to be done after
     * writing the extension files because we will edit them.
     *
     * HTTP links will be skipped.
     */
    view_extension_convert_pages(&extension, &dest_dir).await?;

    // Canonicalize relative icon and page paths
    canonicalize_relative_icon_path(&dest_dir, &mut extension)?;
    canonicalize_relative_page_path(&dest_dir, &mut extension)?;

    // Add extension to the search source
    third_party_ext_list_write_lock.push(extension);

    Ok(())
}

/// Helper function to recursively copy directories.
#[async_recursion::async_recursion]
async fn copy_dir_recursively(src: &Path, dest: &Path) -> Result<(), String> {
    tokio::fs::create_dir_all(dest)
        .await
        .map_err(|e| e.to_string())?;
    let mut read_dir = tokio::fs::read_dir(src).await.map_err(|e| e.to_string())?;

    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursively(&src_path, &dest_path).await?;
        } else {
            tokio::fs::copy(&src_path, &dest_path)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
