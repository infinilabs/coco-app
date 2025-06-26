use super::super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::{
    document::{DataSourceReference, Document},
    error::SearchError,
    search::{QueryResponse, QuerySource, SearchQuery},
    traits::SearchSource,
};
use async_trait::async_trait;
use hostname;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;
use std::process::Command;
use std::sync::LazyLock;
use tauri_plugin_store::StoreExt;

pub(crate) const EXTENSION_ID: &str = "FileSystem";

// TODO: field rename
//
// title -> name
//
/// JSON file for this extension.
pub(crate) const PLUGIN_JSON_FILE: &str = r#"
{
  "id": "FileSystem",
  "title": "File System Search",
  "platforms": ["macos"],
  "description": "Search files on your system using macOS Spotlight",
  "icon": "font_TODO",
  "type": "command",
  "enabled": true
}
"#;

// Tauri store keys for file system configuration
const TAURI_STORE_FILE_SYSTEM_CONFIG: &str = "file_system_config";

const TAURI_STORE_KEY_SEARCH_BY: &str = "search_by";
const TAURI_STORE_KEY_SEARCH_PATHS: &str = "search_paths";
const TAURI_STORE_KEY_EXCLUDE_PATHS: &str = "exclude_paths";
const TAURI_STORE_KEY_FILE_TYPES: &str = "file_types";

static HOME_DIR: LazyLock<String> = LazyLock::new(|| {
    let os_string = dirs::home_dir()
        .expect("$HOME should be set")
        .into_os_string();
    os_string
        .into_string()
        .expect("User home directory should be encoded with UTF-8")
});

#[derive(Debug, Clone, Serialize, Deserialize, Copy)]
pub enum SearchBy {
    Name,
    NameAndContents,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSearchConfig {
    pub search_paths: Vec<String>,
    pub exclude_paths: Vec<String>,
    pub file_types: Vec<String>,
    pub search_by: SearchBy,
}

impl Default for FileSearchConfig {
    fn default() -> Self {
        Self {
            search_paths: vec![
                format!("{}/Documents", HOME_DIR.as_str()),
                format!("{}/Desktop", HOME_DIR.as_str()),
                format!("{}/Downloads", HOME_DIR.as_str()),
            ],
            exclude_paths: Vec::new(),
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        }
    }
}

impl FileSearchConfig {
    fn get() -> Self {
        let tauri_app_handle = crate::GLOBAL_TAURI_APP_HANDLE
            .get()
            .expect("global tauri app handle not set");

        let store = tauri_app_handle
            .store(TAURI_STORE_FILE_SYSTEM_CONFIG)
            .unwrap_or_else(|e| {
                panic!(
                    "store [{}] not found/loaded, error [{}]",
                    TAURI_STORE_FILE_SYSTEM_CONFIG, e
                )
            });

        // Default value, will be used when specific config entries are not set
        let default_config = FileSearchConfig::default();

        let search_paths = {
            if let Some(search_paths) = store.get(TAURI_STORE_KEY_SEARCH_PATHS) {
                match search_paths {
                    Value::Array(arr) => {
                        let mut vec = Vec::with_capacity(arr.len());
                        for v in arr {
                            match v {
                                Value::String(s) => vec.push(s),
                                other => panic!(
                                    "Expected all elements of 'search_paths' to be strings, but found: {:?}",
                                    other
                                ),
                            }
                        }
                        vec
                    }
                    other => panic!(
                        "Expected 'search_paths' to be an array of strings in the file system config store, but got: {:?}",
                        other
                    ),
                }
            } else {
                store.set(
                    TAURI_STORE_KEY_SEARCH_PATHS,
                    default_config.search_paths.as_slice(),
                );
                default_config.search_paths
            }
        };

        let exclude_paths = {
            if let Some(exclude_paths) = store.get(TAURI_STORE_KEY_EXCLUDE_PATHS) {
                match exclude_paths {
                    Value::Array(arr) => {
                        let mut vec = Vec::with_capacity(arr.len());
                        for v in arr {
                            match v {
                                Value::String(s) => vec.push(s),
                                other => panic!(
                                    "Expected all elements of 'exclude_paths' to be strings, but found: {:?}",
                                    other
                                ),
                            }
                        }
                        vec
                    }
                    other => panic!(
                        "Expected 'exclude_paths' to be an array of strings in the file system config store, but got: {:?}",
                        other
                    ),
                }
            } else {
                store.set(
                    TAURI_STORE_KEY_EXCLUDE_PATHS,
                    default_config.exclude_paths.as_slice(),
                );
                default_config.exclude_paths
            }
        };

        let file_types = {
            if let Some(file_types) = store.get(TAURI_STORE_KEY_FILE_TYPES) {
                match file_types {
                    Value::Array(arr) => {
                        let mut vec = Vec::with_capacity(arr.len());
                        for v in arr {
                            match v {
                                Value::String(s) => vec.push(s),
                                other => panic!(
                                    "Expected all elements of 'file_types' to be strings, but found: {:?}",
                                    other
                                ),
                            }
                        }
                        vec
                    }
                    other => panic!(
                        "Expected 'file_types' to be an array of strings in the file system config store, but got: {:?}",
                        other
                    ),
                }
            } else {
                store.set(
                    TAURI_STORE_KEY_FILE_TYPES,
                    default_config.file_types.as_slice(),
                );
                default_config.file_types
            }
        };

        let search_by = {
            if let Some(search_by) = store.get(TAURI_STORE_KEY_SEARCH_BY) {
                serde_json::from_value(search_by.clone()).unwrap_or_else(|e| {
                    panic!(
                        "Failed to deserialize 'search_by' from file system config store. Invalid JSON: {:?}, error: {}",
                        search_by, e
                    )
                })
            } else {
                store.set(
                    TAURI_STORE_KEY_SEARCH_BY,
                    serde_json::to_value(default_config.search_by).unwrap(),
                );
                default_config.search_by
            }
        };

        Self {
            search_by,
            search_paths,
            exclude_paths,
            file_types,
        }
    }
}

pub struct FileSearchExtensionSearchSource {
    base_score: f64,
}

impl FileSearchExtensionSearchSource {
    pub fn new(base_score: f64) -> Self {
        FileSearchExtensionSearchSource { base_score }
    }

    fn build_mdfind_query(&self, query_string: &str, config: &FileSearchConfig) -> Vec<String> {
        let mut args = vec!["mdfind".to_string()];

        // Build the query string with file type filters
        let mut query_parts = Vec::new();

        // Add search criteria based on search mode
        match config.search_by {
            SearchBy::Name => {
                query_parts.push(format!("kMDItemFSName == '*{}*'", query_string));
            }
            SearchBy::NameAndContents => {
                query_parts.push(format!("kMDItemTextContent == '{}'", query_string));
            }
        }

        // Add file type filter if specified
        if !config.file_types.is_empty() {
            let type_query = config
                .file_types
                .iter()
                .map(|t| format!("kMDItemKind == '{}'", t))
                .collect::<Vec<_>>()
                .join(" || ");
            query_parts.push(format!("({})", type_query));
        }

        // Combine all query parts
        let final_query = query_parts.join(" && ");
        args.push(final_query);

        // Add search paths using -onlyin
        for path in &config.search_paths {
            if Path::new(path).exists() {
                args.extend_from_slice(&["-onlyin".to_string(), path.to_string()]);
            }
        }

        args
    }

    fn execute_mdfind_static(args: &[String]) -> Result<Vec<String>, String> {
        let output = Command::new(&args[0])
            .args(&args[1..])
            .output()
            .map_err(|e| format!("Failed to execute mdfind: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "mdfind command failed with status: {}",
                output.status
            ));
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        let results: Vec<String> = output_str
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| line.trim().to_string())
            .collect();

        Ok(results)
    }

    fn filter_excluded_paths(results: Vec<String>, config: &FileSearchConfig) -> Vec<String> {
        if config.exclude_paths.is_empty() {
            return results;
        }

        results
            .into_iter()
            .filter(|path| {
                !config
                    .exclude_paths
                    .iter()
                    .any(|exclude_path| path.starts_with(exclude_path))
            })
            .collect()
    }
}

#[async_trait]
impl SearchSource for FileSearchExtensionSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or(EXTENSION_ID.into())
                .to_string_lossy()
                .into(),
            id: EXTENSION_ID.into(),
        }
    }

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError> {
        let Some(query_string) = query.query_strings.get("query") else {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        };

        let query_string = query_string.trim();
        if query_string.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        }

        // Get configuration from tauri store
        let config = FileSearchConfig::get();

        // Execute search in a blocking task
        let query_source = self.get_type();
        let base_score = self.base_score;
        let mdfind_args = self.build_mdfind_query(query_string, &config);

        let search_results =
            Self::execute_mdfind_static(&mdfind_args).map_err(SearchError::InternalError)?;

        // Filter out excluded paths
        let filtered_results = Self::filter_excluded_paths(search_results, &config);

        // Convert results to documents
        let hits: Vec<(Document, f64)> = filtered_results
            .into_iter()
            .map(|file_path| {
                let doc = Document {
                    id: file_path.clone(),
                    source: Some(DataSourceReference {
                        r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                        name: Some(EXTENSION_ID.into()),
                        id: Some(EXTENSION_ID.into()),
                        icon: Some(String::from("font_TODO")),
                    }),
                    url: Some(file_path),
                    ..Default::default()
                };

                (doc, base_score)
            })
            .collect();

        let total_hits = hits.len();

        Ok(QueryResponse {
            source: query_source,
            hits,
            total_hits,
        })
    }
}

// Tauri commands for managing file system configuration
#[tauri::command]
pub async fn get_file_system_config() -> FileSearchConfig {
    FileSearchConfig::get()
}

#[tauri::command]
pub async fn set_file_system_config(config: FileSearchConfig) -> Result<(), String> {
    let tauri_app_handle = crate::GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");

    let store = tauri_app_handle
        .store(TAURI_STORE_FILE_SYSTEM_CONFIG)
        .map_err(|e| e.to_string())?;

    store.set(TAURI_STORE_KEY_SEARCH_PATHS, config.search_paths);
    store.set(TAURI_STORE_KEY_EXCLUDE_PATHS, config.exclude_paths);
    store.set(TAURI_STORE_KEY_FILE_TYPES, config.file_types);
    store.set(
        TAURI_STORE_KEY_SEARCH_BY,
        serde_json::to_value(config.search_by).unwrap(),
    );

    Ok(())
}
