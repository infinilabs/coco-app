//! File Search configuration entries definition and getter/setter functions.

use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use std::sync::LazyLock;
use tauri::AppHandle;
use tauri::Runtime;
use tauri_plugin_store::StoreExt;

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
    pub(crate) fn get<R: Runtime>(tauri_app_handle: &AppHandle<R>) -> Self {
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

// Tauri commands for managing file system configuration
#[tauri::command]
pub async fn get_file_system_config<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
) -> FileSearchConfig {
    FileSearchConfig::get(&tauri_app_handle)
}

#[tauri::command]
pub async fn set_file_system_config<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    config: FileSearchConfig,
) -> Result<(), String> {
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
