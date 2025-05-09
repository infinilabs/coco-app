pub mod application;
pub mod calculator;
pub mod file_system;

use std::any::Any;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::sync::OnceLock;

use crate::common::register::SearchSourceRegistry;
use serde_json::Value as Json;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store::StoreExt;

pub const LOCAL_QUERY_SOURCE_TYPE: &str = "local";
pub const TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE: &str = "local_query_source_enabled_state";

trait SearchSourceState {
    fn as_mut_any(&mut self) -> &mut dyn Any;
}

#[async_trait::async_trait(?Send)]
trait Task: Send + Sync {
    fn search_source_id(&self) -> &'static str;

    async fn exec(&mut self, state: &mut Option<Box<dyn SearchSourceState>>);
}

static RUNTIME_TX: OnceLock<tokio::sync::mpsc::UnboundedSender<Box<dyn Task>>> = OnceLock::new();

pub(crate) fn start_pizza_engine_runtime() {
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().unwrap();

        let main = async {
            let mut states: HashMap<String, Option<Box<dyn SearchSourceState>>> = HashMap::new();

            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
            RUNTIME_TX.set(tx).unwrap();

            while let Some(mut task) = rx.recv().await {
                let opt_search_source_state = match states.entry(task.search_source_id().into()) {
                    Entry::Occupied(o) => o.into_mut(),
                    Entry::Vacant(v) => v.insert(None),
                };
                task.exec(opt_search_source_state).await;
            }
        };

        rt.block_on(main);
    });
}

pub(crate) async fn init_local_search_source<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<(), String> {
    let enabled_status_store = app_handle
        .store(TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE)
        .map_err(|e| e.to_string())?;
    if enabled_status_store.is_empty() {
        enabled_status_store.set(
            application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME,
            Json::Bool(true),
        );
        enabled_status_store.set(calculator::DATA_SOURCE_ID, Json::Bool(true));
    }
    let registry = app_handle.state::<SearchSourceRegistry>();

    application::ApplicationSearchSource::init(app_handle.clone()).await?;

    for (id, enabled) in enabled_status_store.entries() {
        let enabled = match enabled {
            Json::Bool(b) => b,
            _ => unreachable!("enabled state should be stored as a boolean"),
        };

        if enabled {
            if id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
                registry.register_source(application::ApplicationSearchSource).await;
            }

            if id == calculator::DATA_SOURCE_ID {
                let calculator_search = calculator::CalculatorSource::new(2000f64);
                registry.register_source(calculator_search).await;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_disabled_local_query_sources<R: Runtime>(app_handle: AppHandle<R>) -> Vec<String> {
    let enabled_status_store = app_handle
        .store(TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE)
        .unwrap_or_else(|e| {
            panic!(
                "tauri store [{}] should exist and be loaded, but that's not true due to error [{}]",
                TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE, e
            )
        });
    let mut disabled_local_query_sources = Vec::new();

    for (id, enabled) in enabled_status_store.entries() {
        let enabled = match enabled {
            Json::Bool(b) => b,
            _ => unreachable!("enabled state should be stored as a boolean"),
        };

        if !enabled {
            disabled_local_query_sources.push(id);
        }
    }

    disabled_local_query_sources
}

#[tauri::command]
pub async fn enable_local_query_source<R: Runtime>(
    app_handle: AppHandle<R>,
    query_source_id: String,
) {
    let registry = app_handle.state::<SearchSourceRegistry>();
    if query_source_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        let application_search = application::ApplicationSearchSource;
        registry.register_source(application_search).await;
    }
    if query_source_id == calculator::DATA_SOURCE_ID {
        let calculator_search = calculator::CalculatorSource::new(2000f64);
        registry.register_source(calculator_search).await;
    }

    let enabled_status_store = app_handle
        .store(TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE)
        .unwrap_or_else(|e| {
            panic!(
              "tauri store [{}] should exist and be loaded, but that's not true due to error [{}]",
              TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE, e
          )
        });
    enabled_status_store.set(query_source_id, Json::Bool(true));
}

#[tauri::command]
pub async fn disable_local_query_source<R: Runtime>(
    app_handle: AppHandle<R>,
    query_source_id: String,
) {
    let registry = app_handle.state::<SearchSourceRegistry>();
    registry.remove_source(&query_source_id).await;

    let enabled_status_store = app_handle
        .store(TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE)
        .unwrap_or_else(|e| {
            panic!(
          "tauri store [{}] should exist and be loaded, but that's not true due to error [{}]",
          TAURI_STORE_LOCAL_QUERY_SOURCE_ENABLED_STATE, e
      )
        });
    enabled_status_store.set(query_source_id, Json::Bool(false));
}
