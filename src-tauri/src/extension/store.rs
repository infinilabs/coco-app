//! Extension store related stuff.

use super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::document::DataSourceReference;
use crate::common::document::Document;
use crate::common::error::SearchError;
use crate::common::search::QueryResponse;
use crate::common::search::QuerySource;
use crate::common::search::SearchQuery;
use crate::common::traits::SearchSource;
use crate::extension::canonicalize_relative_icon_path;
use crate::extension::third_party::THIRD_PARTY_EXTENSIONS_DIRECTORY;
use crate::extension::Extension;
use crate::extension::PLUGIN_JSON_FILE_NAME;
use crate::extension::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::Map as JsonObject;
use serde_json::Value as Json;
use std::sync::LazyLock;
use reqwest::StatusCode;

const DATA_SOURCE_ID: &str = "extension_store";

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

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError> {
        const SCORE: f64 = 2000.0;

        let Some(query_string) = query.query_strings.get("query") else {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        };

        if query_string.contains("extension") || query_string.contains("store") {
            let doc = Document {
                id: DATA_SOURCE_ID.to_string(),
                category: Some(DATA_SOURCE_ID.to_string()),
                title: Some("Extension Store".to_string()),
                source: Some(DataSourceReference {
                    r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                    name: Some(DATA_SOURCE_ID.into()),
                    id: Some(DATA_SOURCE_ID.into()),
                    icon: None,
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

// Cache the client since it caches connections internally.
static CLIENT: LazyLock<Client> = LazyLock::new(|| Client::new());

#[tauri::command]
pub(crate) async fn search_extension(
    query_params: Option<Vec<String>>,
) -> Result<Vec<Json>, String> {
    println!("query_params: {:?}", query_params);

    let query_params: Vec<(&str, &str)> = match query_params {
        Some(ref v) => {
            let mut parsed = Vec::new();
            for parameter in v.iter() {
                let (key, value) = parameter
                    .split_once('=')
                    .expect("query parameter should contain a '='");
                parsed.push((key, value));
            }

            parsed
        }
        None => Vec::new(),
    };

    let response = CLIENT
        .get("http://infini.tpddns.cn:27200/store/extension/_search")
        .query(&query_params)
        .send()
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
            .expect("developer.id should exist")
            .to_string();

        let extension_id = source_obj
            .get("id")
            .and_then(|id| id.as_str())
            .expect("extension id should exist")
            .to_string();

        let installed = is_extension_installed(developer_id, extension_id).await;
        source_obj.insert("installed".to_string(), Json::Bool(installed));

        extensions.push(Json::Object(source_obj));
    }

    Ok(extensions)
}

async fn is_extension_installed(developer: String, extension_id: String) -> bool {
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .extension_exists(&developer, &extension_id)
        .await
}

#[tauri::command]
pub(crate) async fn install_extension(id: String) -> Result<(), String> {
    let response = CLIENT
        .get(format!(
            "http://infini.tpddns.cn:27200/store/extension/{}/_download",
            id
        ))
        .send()
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

    let mut plugin_json = archive.by_name("plugin.json").map_err(|e| e.to_string())?;
    let mut plugin_json_content = String::new();
    std::io::Read::read_to_string(&mut plugin_json, &mut plugin_json_content)
        .map_err(|e| e.to_string())?;
    let mut extension: Json = serde_json::from_str(&plugin_json_content)
        .map_err(|e| format!("Failed to parse plugin.json: {}", e))?;

    let mut_ref_to_developer_object: &mut Json = extension.as_object_mut().expect("plugin.json should be an object").get_mut("developer").expect("plugin.json should contain field [developer]");
    let developer_id = mut_ref_to_developer_object.get("id").expect("plugin.json should contain [developer.id]").as_str().expect("plugin.json field [developer.id] should be a string");
    *mut_ref_to_developer_object = Json::String(developer_id.into());

    let extension: Extension = serde_json::from_value(extension).unwrap_or_else(|e| {
      panic!("cannot parse plugin.json as struct Extension, error [{}]", e);
    });

    drop(plugin_json);

    let developer = extension.developer.clone().unwrap_or_default();
    let extension_id = extension.id.clone();

    // Extract the zip file
    let extension_directory = {
        let mut path = THIRD_PARTY_EXTENSIONS_DIRECTORY.to_path_buf();
        path.push(developer);
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

    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .add_extension(extension)
        .await;

    Ok(())
}

#[tauri::command]
pub(crate) async fn uninstall_extension(
    developer: String,
    extension_id: String,
) -> Result<(), String> {
    let extension_dir = {
        let mut path = THIRD_PARTY_EXTENSIONS_DIRECTORY.join(developer.as_str());
        path.push(extension_id.as_str());

        path
    };
    if !extension_dir.try_exists().map_err(|e| e.to_string())? {
        panic!(
            "we are uninstalling extension [{}/{}], but there is no such extension files on disk",
            developer, extension_id
        )
    }
    tokio::fs::remove_dir_all(extension_dir.as_path())
        .await
        .map_err(|e| e.to_string())?;

    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .remove_extension(&developer, &extension_id)
        .await;

    Ok(())
}
