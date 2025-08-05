//! Extension store related stuff.

use super::super::LOCAL_QUERY_SOURCE_TYPE;
use super::is_extension_installed;
use crate::common::document::DataSourceReference;
use crate::common::document::Document;
use crate::common::error::SearchError;
use crate::common::search::QueryResponse;
use crate::common::search::QuerySource;
use crate::common::search::SearchQuery;
use crate::common::traits::SearchSource;
use crate::extension::Extension;
use crate::extension::PLUGIN_JSON_FILE_NAME;
use crate::extension::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;
use crate::extension::canonicalize_relative_icon_path;
use crate::extension::third_party::check::general_check;
use crate::extension::third_party::get_third_party_extension_directory;
use crate::extension::third_party::install::filter_out_incompatible_sub_extensions;
use crate::server::http_client::HttpClient;
use crate::util::platform::Platform;
use async_trait::async_trait;
use http::Method;
use reqwest::StatusCode;
use serde_json::Map as JsonObject;
use serde_json::Value as Json;
use std::io::Read;
use tauri::AppHandle;

const DATA_SOURCE_ID: &str = "Extension Store";

pub(crate) struct ExtensionStore;

#[async_trait]
impl SearchSource for ExtensionStore {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or(DATA_SOURCE_ID.into())
                .to_string_lossy()
                .into(),
            id: DATA_SOURCE_ID.into(),
        }
    }

    async fn search(
        &self,
        _tauri_app_handle: AppHandle,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        const SCORE: f64 = 2000.0;

        let Some(query_string) = query.query_strings.get("query") else {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        };

        let lowercase_query_string = query_string.to_lowercase();
        let expected_str = "extension store";

        if expected_str.contains(&lowercase_query_string) {
            let doc = Document {
                id: DATA_SOURCE_ID.to_string(),
                category: Some(DATA_SOURCE_ID.to_string()),
                title: Some(DATA_SOURCE_ID.to_string()),
                icon: Some("font_Store".to_string()),
                source: Some(DataSourceReference {
                    r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                    name: Some(DATA_SOURCE_ID.into()),
                    id: Some(DATA_SOURCE_ID.into()),
                    icon: Some("font_Store".to_string()),
                }),
                ..Default::default()
            };

            Ok(QueryResponse {
                source: self.get_type(),
                hits: vec![(doc, SCORE)],
                total_hits: 1,
            })
        } else {
            Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            })
        }
    }
}

#[tauri::command]
pub(crate) async fn search_extension(
    query_params: Option<Vec<String>>,
) -> Result<Vec<Json>, String> {
    let response = HttpClient::get(
        "default_coco_server",
        "store/extension/_search",
        query_params,
    )
    .await
    .map_err(|e| format!("Failed to send request: {:?}", e))?;

    // The response of a ES style search request
    let mut response: JsonObject<String, Json> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {:?}", e))?;

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

    let Some(hits_hits_json) = hits.remove("hits") else {
        return Ok(Vec::new());
    };

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

        let mut source_obj = match source {
            Json::Object(obj) => obj,
            _ => panic!(
                "field [_source] should be a JSON object, but it is not, value: [{}]",
                source
            ),
        };

        let developer_id = source_obj
            .get("developer")
            .and_then(|dev| dev.get("id"))
            .and_then(|id| id.as_str())
            .expect("developer.id should exist");

        let extension_id = source_obj
            .get("id")
            .and_then(|id| id.as_str())
            .expect("extension id should exist");

        let installed = is_extension_installed(developer_id, extension_id).await;
        source_obj.insert("installed".to_string(), Json::Bool(installed));

        extensions.push(Json::Object(source_obj));
    }

    Ok(extensions)
}

#[tauri::command]
pub(crate) async fn extension_detail(
    id: String,
) -> Result<Option<JsonObject<String, Json>>, String> {
    let url = format!("http://dev.infini.cloud:27200/store/extension/{}", id);
    let response =
        HttpClient::send_raw_request(Method::GET, url.as_str(), None, None, None).await?;

    if response.status() == StatusCode::NOT_FOUND {
        return Ok(None);
    }

    let response_dbg_str = format!("{:?}", response);
    // The response of an ES style GET request
    let mut response: JsonObject<String, Json> = response.json().await.unwrap_or_else(|_e| {
        panic!(
            "response body of [/store/extension/<ID>] is not a JSON object, response [{:?}]",
            response_dbg_str
        )
    });
    let source_json = response.remove("_source").unwrap_or_else(|| {
        panic!("field [_source] not found in the JSON returned from [/store/extension/<ID>]")
    });
    let mut source_obj = match source_json {
        Json::Object(obj) => obj,
        _ => panic!(
            "field [_source] should be a JSON object, but it is not, value: [{}]",
            source_json
        ),
    };

    let developer_id = match &source_obj["developer"]["id"] {
        Json::String(dev) => dev,
        _ => {
            panic!(
                "field [_source.developer.id] should be a string, but it is not, value: [{}]",
                source_obj["developer"]["id"]
            )
        }
    };
    let installed = is_extension_installed(developer_id, &id).await;
    source_obj.insert("installed".to_string(), Json::Bool(installed));

    Ok(Some(source_obj))
}

#[tauri::command]
pub(crate) async fn install_extension_from_store(
    tauri_app_handle: AppHandle,
    id: String,
) -> Result<(), String> {
    let path = format!("store/extension/{}/_download", id);
    let response = HttpClient::get("default_coco_server", &path, None)
        .await
        .map_err(|e| format!("Failed to download extension: {}", e))?;

    if response.status() == StatusCode::NOT_FOUND {
        return Err(format!("extension [{}] not found", id));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    let cursor = std::io::Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // The plugin.json sent from the server does not conform to our `struct Extension` definition:
    //
    // 1. Its `developer` field is a JSON object, but we need a string
    // 2. sub-extensions won't have their `id` fields set
    //
    // we need to correct it
    let mut plugin_json = archive
        .by_name(PLUGIN_JSON_FILE_NAME)
        .map_err(|e| e.to_string())?;
    let mut plugin_json_content = String::new();
    std::io::Read::read_to_string(&mut plugin_json, &mut plugin_json_content)
        .map_err(|e| e.to_string())?;
    let mut extension: Json = serde_json::from_str(&plugin_json_content)
        .map_err(|e| format!("Failed to parse plugin.json: {}", e))?;

    let mut_ref_to_developer_object: &mut Json = extension
        .as_object_mut()
        .expect("plugin.json should be an object")
        .get_mut("developer")
        .expect("plugin.json should contain field [developer]");
    let developer_id = mut_ref_to_developer_object
        .get("id")
        .expect("plugin.json should contain [developer.id]")
        .as_str()
        .expect("plugin.json field [developer.id] should be a string");
    *mut_ref_to_developer_object = Json::String(developer_id.into());

    // Set IDs for sub-extensions (commands, quicklinks, scripts)
    let mut counter = 0;
    // Helper function to set IDs for array fields
    fn set_ids_for_field(extension: &mut Json, field_name: &str, counter: &mut i32) {
        if let Some(field) = extension.as_object_mut().unwrap().get_mut(field_name) {
            if let Some(array) = field.as_array_mut() {
                for item in array {
                    if let Some(item_obj) = item.as_object_mut() {
                        if !item_obj.contains_key("id") {
                            item_obj.insert("id".to_string(), Json::String(counter.to_string()));
                            *counter += 1;
                        }
                    }
                }
            }
        }
    }
    set_ids_for_field(&mut extension, "commands", &mut counter);
    set_ids_for_field(&mut extension, "quicklinks", &mut counter);
    set_ids_for_field(&mut extension, "scripts", &mut counter);

    // Now the extension JSON is valid
    let mut extension: Extension = serde_json::from_value(extension).unwrap_or_else(|e| {
        panic!(
            "cannot parse plugin.json as struct Extension, error [{:?}]",
            e
        );
    });

    drop(plugin_json);

    general_check(&extension)?;

    let current_platform = Platform::current();
    if let Some(ref platforms) = extension.platforms {
        if !platforms.contains(&current_platform) {
            return Err("this extension is not compatible with your OS".into());
        }
    }

    // Extension is compatible with current platform, but it could contain sub
    // extensions that are not, filter them out.
    filter_out_incompatible_sub_extensions(&mut extension, current_platform);

    // Write extension files to the extension directory
    let developer = extension.developer.clone().unwrap_or_default();
    let extension_id = extension.id.clone();
    let extension_directory = {
        let mut path = get_third_party_extension_directory(&tauri_app_handle);
        path.push(developer);
        path.push(extension_id.as_str());
        path
    };
    tokio::fs::create_dir_all(extension_directory.as_path())
        .await
        .map_err(|e| e.to_string())?;

    // Extract all files except plugin.json
    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i).map_err(|e| e.to_string())?;
        // `.name()` is safe to use in our cases, the cases listed in the below
        // page won't happen to us.
        //
        // https://docs.rs/zip/4.2.0/zip/read/struct.ZipFile.html#method.name
        //
        // Example names:
        //
        // * `assets/icon.png`
        // * `assets/screenshot.png`
        // * `plugin.json`
        //
        // Yes, the `assets` directory is not a part of it.
        let zip_file_name = zip_file.name();

        // Skip the plugin.json file as we'll create it from the extension variable
        if zip_file_name == PLUGIN_JSON_FILE_NAME {
            continue;
        }

        let dest_file_path = extension_directory.join(zip_file_name);

        // For cases like `assets/xxx.png`
        if let Some(parent_dir) = dest_file_path.parent()
            && !parent_dir.exists()
        {
            tokio::fs::create_dir_all(parent_dir)
                .await
                .map_err(|e| e.to_string())?;
        }

        let mut dest_file = tokio::fs::File::create(&dest_file_path)
            .await
            .map_err(|e| e.to_string())?;
        let mut src_bytes = Vec::with_capacity(
            zip_file
                .size()
                .try_into()
                .expect("we won't have a extension file that is bigger than 4GiB"),
        );
        zip_file
            .read_to_end(&mut src_bytes)
            .map_err(|e| e.to_string())?;
        tokio::io::copy(&mut src_bytes.as_slice(), &mut dest_file)
            .await
            .map_err(|e| e.to_string())?;
    }
    // Create plugin.json from the extension variable
    let plugin_json_path = extension_directory.join(PLUGIN_JSON_FILE_NAME);
    let extension_json = serde_json::to_string_pretty(&extension).map_err(|e| e.to_string())?;
    tokio::fs::write(&plugin_json_path, extension_json)
        .await
        .map_err(|e| e.to_string())?;

    // Turn it into an absolute path if it is a valid relative path because frontend code need this.
    canonicalize_relative_icon_path(&extension_directory, &mut extension)?;

    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .add_extension(extension)
        .await;

    Ok(())
}
