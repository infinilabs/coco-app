use crate::common::error::SearchError;
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::SearchSource;
use crate::local::LOCAL_QUERY_SOURCE_TYPE;
use async_trait::async_trait;
use tauri::{AppHandle, Runtime};
use super::AppEntry;
use super::AppMetadata;

pub(crate) const QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME: &str = "Applications";

pub struct ApplicationSearchSource;

impl ApplicationSearchSource {
    pub async fn init<R: Runtime>(_app_handle: AppHandle<R>) -> Result<(), String> {
        Ok(())
    }
}

#[async_trait]
impl SearchSource for ApplicationSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or("My Computer".into())
                .to_string_lossy()
                .into(),
            id: QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME.into(),
        }
    }

    async fn search(&self, _query: SearchQuery) -> Result<QueryResponse, SearchError> {
        Ok(QueryResponse {
            source: self.get_type(),
            hits: Vec::new(),
            total_hits: 0,
        })
    }
}

#[tauri::command]
pub async fn set_app_alias(_app_path: String, _alias: String) -> Result<(), String> {
    unreachable!("app list should be empty, there is no way this can be invoked")
}

#[tauri::command]
pub async fn register_app_hotkey<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
    _app_path: String,
    _hotkey: String,
) -> Result<(), String> {
    unreachable!("app list should be empty, there is no way this can be invoked")
}

#[tauri::command]
pub async fn unregister_app_hotkey<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
    _app_path: String,
) -> Result<(), String> {
    unreachable!("app list should be empty, there is no way this can be invoked")
}

#[tauri::command]
pub async fn disable_app_search<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
    _app_path: String,
) -> Result<(), String> {
    // no-op
    Ok(())
}

#[tauri::command]
pub async fn enable_app_search<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
    _app_path: String,
) -> Result<(), String> {
    // no-op
    Ok(())
}

#[tauri::command]
pub async fn add_app_search_path<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
    _search_path: String,
) -> Result<(), String> {
    // no-op
    Ok(())
}

#[tauri::command]
pub async fn remove_app_search_path<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
    _search_path: String,
) -> Result<(), String> {
    // no-op
    Ok(())
}

#[tauri::command]
pub async fn get_app_search_path<R: Runtime>(_tauri_app_handle: AppHandle<R>) -> Vec<String> {
    // Return an empty list
    Vec::new()
}


#[tauri::command]
pub async fn get_app_list<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
) -> Result<Vec<AppEntry>, String> {
    // Return an empty list
    Ok(Vec::new())
}

#[tauri::command]
pub async fn get_app_metadata<R: Runtime>(
    _tauri_app_handle: AppHandle<R>,
    _app_path: String,
) -> Result<AppMetadata, String> {
    unreachable!("app list should be empty, there is no way this can be invoked")
}
