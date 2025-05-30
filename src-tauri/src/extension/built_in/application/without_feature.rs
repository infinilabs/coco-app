use super::super::Extension;
use super::AppMetadata;
use crate::common::error::SearchError;
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::SearchSource;
use crate::extension::LOCAL_QUERY_SOURCE_TYPE;
use async_trait::async_trait;
use tauri::{AppHandle, Runtime};

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

pub fn set_app_alias<R: Runtime>(_tauri_app_handle: &AppHandle<R>, _app_path: &str, _alias: &str) {
    unreachable!("app list should be empty, there is no way this can be invoked")
}

pub fn register_app_hotkey<R: Runtime>(
    _tauri_app_handle: &AppHandle<R>,
    _app_path: &str,
    _hotkey: &str,
) -> Result<(), String> {
    unreachable!("app list should be empty, there is no way this can be invoked")
}

pub fn unregister_app_hotkey<R: Runtime>(
    _tauri_app_handle: &AppHandle<R>,
    _app_path: &str,
) -> Result<(), String> {
    unreachable!("app list should be empty, there is no way this can be invoked")
}

pub fn disable_app_search<R: Runtime>(
    _tauri_app_handle: &AppHandle<R>,
    _app_path: &str,
) -> Result<(), String> {
    // no-op
    Ok(())
}

pub fn enable_app_search<R: Runtime>(
    _tauri_app_handle: &AppHandle<R>,
    _app_path: &str,
) -> Result<(), String> {
    // no-op
    Ok(())
}

pub fn is_app_search_enabled(_app_path: &str) -> bool {
    false
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
) -> Result<Vec<Extension>, String> {
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
