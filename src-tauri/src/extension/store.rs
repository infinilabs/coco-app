//! Extension store related stuff.

use crate::extension::canonicalize_relative_icon_path;
use crate::extension::third_party::THIRD_PARTY_EXTENSIONS_DIRECTORY;
use crate::extension::Extension;
use crate::extension::PLUGIN_JSON_FILE_NAME;
use crate::extension::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;
use reqwest::Client;
use serde_json::Map as JsonObject;
use serde_json::Value as Json;
use std::sync::LazyLock;

// Cache the client since it caches connections internally.
static CLIENT: LazyLock<Client> = LazyLock::new(|| Client::new());

#[tauri::command]
pub(crate) async fn search_extension(
    query: String,
    from: Option<usize>,
    size: Option<usize>,
    _sort_by: (),
) -> Result<Vec<Extension>, String> {
    let from = from.unwrap_or(0);
    let size = size.unwrap_or(10);

    let response = CLIENT
        .post("extension/_search")
        .query(&[
            ("query", query),
            ("from", from.to_string()),
            ("size", size.to_string()),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    // The response of a ES style search request
    let mut response: JsonObject<String, Json> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let hits_json = response
        .remove("hits")
        .expect("the JSON response should contain field [hits]");
    let mut hits = match hits_json {
        Json::Object(obj) => obj,
        _ => panic!(
            "field [hits] should be a JSON object, but it is not, value: [{}]",
            hits_json
        ),
    };

    let hits_hits_json = hits
        .remove("hits")
        .expect("the JSON response should contain field [hits.hits]");
    let hits_hits = match hits_hits_json {
        Json::Array(arr) => arr,
        _ => panic!(
            "field [hits.hits] should be an array, but it is not, value: [{}]",
            hits_hits_json
        ),
    };

    let mut extensions = Vec::with_capacity(hits_hits.len());
    for hit in hits_hits {
        let mut hit_obj = match hit {
            Json::Object(obj) => obj,
            _ => panic!(
                "each hit in [hits.hits] should be a JSON object, but it is not, value: [{}]",
                hit
            ),
        };

        let source = hit_obj
            .remove("_source")
            .expect("each hit should contain field [_source]");

        // For error message, do this before `from_value()` as it will be moved there.
        let source_str = source.to_string();
        match serde_json::from_value::<Extension>(source) {
            Ok(extension) => extensions.push(extension),
            Err(e) => panic!(
                "failed to parse extension from source: {}, invalid source: [{}]",
                e, source_str
            ),
        }
    }

    Ok(extensions)
}

#[tauri::command]
pub(crate) async fn is_extension_installed(author: String, extension_id: String) -> bool {
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .extension_exists(&author, &extension_id)
        .await
}

#[tauri::command]
pub(crate) async fn install_extension(author: String, extension_id: String) -> Result<(), String> {
    let id = format!("{}/{}", author, extension_id);

    let response = CLIENT
        .get("extension/_download")
        .query(&[("id", &id)])
        .send()
        .await
        .map_err(|e| format!("Failed to download extension: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    let cursor = std::io::Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Extract the zip file
    let extension_directory = {
        let mut path = THIRD_PARTY_EXTENSIONS_DIRECTORY.to_path_buf();
        path.push(author.as_str());
        path.push(extension_id.as_str());
        path
    };

    tokio::fs::create_dir_all(extension_directory.as_path())
        .await
        .map_err(|e| e.to_string())?;
    archive
        .extract(extension_directory.as_path())
        .map_err(|e| e.to_string())?;

    let plugin_json_file_path = {
        let mut path = extension_directory.clone();
        path.push(PLUGIN_JSON_FILE_NAME);

        path
    };

    let plugin_json_file_content = tokio::fs::read_to_string(&plugin_json_file_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut extension = match serde_json::from_str::<Extension>(&plugin_json_file_content) {
        Ok(extension) => extension,
        Err(e) => return Err(format!("invalid extension, cannot parse it, error [{}]", e)),
    };

    // Turn it into an absolute path if it is a valid relative path because frontend code need this.
    canonicalize_relative_icon_path(&extension_directory, &mut extension)?;

    // Set extension's author info manually.
    extension.author = Some(author.clone());

    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .add_extension(extension)
        .await;

    Ok(())
}

#[tauri::command]
pub(crate) async fn uninstall_extension(
    author: String,
    extension_id: String,
) -> Result<(), String> {
    let extension_dir = {
        let mut path = THIRD_PARTY_EXTENSIONS_DIRECTORY.join(author.as_str());
        path.push(extension_id.as_str());

        path
    };
    if !extension_dir.try_exists().map_err(|e| e.to_string())? {
        panic!(
            "we are uninstalling extension [{}/{}], but there is no such extension files on disk",
            author, extension_id
        )
    }
    tokio::fs::remove_dir_all(extension_dir.as_path())
        .await
        .map_err(|e| e.to_string())?;

    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .remove_extension(&author, &extension_id)
        .await;

    Ok(())
}
