use super::super::SearchSourceState;
use super::super::Task;
use super::super::RUNTIME_TX;
use super::AppEntry;
use super::AppMetadata;
use crate::common::document::{DataSourceReference, Document};
use crate::common::error::SearchError;
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::SearchSource;
use crate::local::LOCAL_QUERY_SOURCE_TYPE;
use crate::util::open;
use crate::GLOBAL_TAURI_APP_HANDLE;
use applications::{App, AppTrait};
use async_trait::async_trait;
use log::{debug, info, warn};
use pizza_engine::document::FieldType;
use pizza_engine::document::{
    Document as PizzaEngineDocument, DraftDoc as PizzaEngineDraftDoc, FieldValue,
};
use pizza_engine::document::{Property, Schema};
use pizza_engine::error::PizzaEngineError;
use pizza_engine::search::{OriginalQuery, QueryContext, SearchResult, Searcher};
use pizza_engine::store::{DiskStore, DiskStoreSnapshot};
use pizza_engine::writer::Writer;
use pizza_engine::{doc, Engine, EngineBuilder};
use serde_json::Value as Json;
use std::collections::HashMap;
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::{async_runtime, AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_fs_pro::{icon, metadata, name, IconOptions};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_store::StoreExt;
use tokio::sync::oneshot::Sender as OneshotSender;

const FIELD_APP_NAME: &str = "app_name";
const FIELD_ICON_PATH: &str = "icon_path";
const FIELD_APP_ALIAS: &str = "app_alias";
const APPLICATION_SEARCH_SOURCE_ID: &str = "application";

const TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH: &str = "disabled_app_list_and_search_path";
const TAURI_STORE_APP_HOTKEY: &str = "app_hotkey";
const TAURI_STORE_KEY_SEARCH_PATH: &str = "search_path";
const TAURI_STORE_KEY_DISABLED_APP_LIST: &str = "disabled_app_list";

/// We use this as:
///
/// 1. querysource ID
/// 2. datasource ID
/// 3. datasource name
pub(crate) const QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME: &str = "Applications";

pub fn get_default_search_paths() -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        let home_dir =
            PathBuf::from(std::env::var_os("HOME").expect("environment variable $HOME not found"));
        return vec![
            "/Applications".into(),
            "/System/Applications".into(),
            "/System/Library/CoreServices".into(),
            home_dir
                .join("Applications")
                .into_os_string()
                .into_string()
                .expect("this path should be UTF-8 encoded"),
        ];
    }

    #[cfg(not(target_os = "macos"))]
    {
        let paths = applications::get_default_search_paths();
        let mut ret = Vec::with_capacity(paths.len());
        for search_path in paths {
            let path_string = search_path
                .into_os_string()
                .into_string()
                .expect("path should be UTF-8 encoded");

            ret.push(path_string);
        }

        ret
    }
}

/// Helper function to return `app`'s path.
///
/// * Windows: return the path to application's exe
/// * macOS: return the path to the `.app` bundle
/// * Linux: return the path to the `.desktop` file
fn get_app_path(app: &App) -> String {
    let path = if cfg!(target_os = "windows") {
        assert!(
            app.icon_path.is_some(),
            "we only accept Applications with icons"
        );
        app.app_path_exe
            .as_ref()
            .expect("icon is Some, exe path should be Some as well")
            .to_path_buf()
    } else {
        app.app_desktop_path.clone()
    };

    path.into_os_string()
        .into_string()
        .expect("should be UTF-8 encoded")
}

/// Helper function to return `app`'s path.
///
/// * Windows/macOS: extract `app_path`'s file name and remove the file extension
/// * Linux: return the name specified in `.desktop` file
async fn get_app_name(app: &App) -> String {
    if cfg!(target_os = "linux") {
        app.name.clone()
    } else {
        let app_path = get_app_path(app);
        name(app_path.into()).await
    }
}

/// Helper function to return an absolute path to `app`'s icon.
///
/// On macOS/Windows, we cache icons in our data directory using the `icon()` function.
async fn get_app_icon_path<R: Runtime>(
    tauri_app_handle: &AppHandle<R>,
    app: &App,
) -> Result<String, String> {
    let res_path = if cfg!(target_os = "linux") {
        let icon_path = app
            .icon_path
            .as_ref()
            .expect("We only accept applications with icons")
            .to_path_buf();

        Ok(icon_path)
    } else {
        let app_path = get_app_path(app);
        let options = IconOptions {
            size: Some(256),
            save_path: None,
        };

        icon(tauri_app_handle.clone(), app_path.into(), Some(options))
            .await
            .map_err(|err| err.to_string())
    };

    let path = res_path?;

    Ok(path
        .into_os_string()
        .into_string()
        .expect("should be UTF-8 encoded"))
}

/// Return all the Apps found under `search_path`.
///
/// Note: apps with no icons will be filtered out.
fn list_app_in(search_path: Vec<String>) -> Result<Vec<App>, String> {
    let search_path = search_path
        .into_iter()
        .map(PathBuf::from)
        .collect::<Vec<_>>();

    let apps = applications::get_all_apps(&search_path).map_err(|err| err.to_string())?;

    Ok(apps
        .into_iter()
        .filter(|app| app.icon_path.is_some())
        .collect())
}

// A homemade version of `std::try!()` for use in the `Task::exec()` function.
///
/// It can only be used in functions where the Err variant of the Result type is String.
macro_rules! task_exec_try {
    ($result:expr, $callback:expr) => {
        match $result {
            Ok(ok) => ok,
            Err(e) => {
                let e_str = e.to_string();
                $callback.send(Err(e_str)).unwrap();
                return;
            }
        }
    };
}

struct ApplicationSearchSourceState {
    engine: Engine<DiskStore>,
    writer: Writer<DiskStore>,
    searcher: Searcher<DiskStore>,
    snapshot: DiskStoreSnapshot,
}

impl SearchSourceState for ApplicationSearchSourceState {
    fn as_mut_any(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

/// Upon application start, index all the applications found in the `get_default_search_paths()`.
struct IndexAllApplicationsTask<R: Runtime> {
    tauri_app_handle: AppHandle<R>,
    callback: Option<tokio::sync::oneshot::Sender<Result<(), String>>>,
}

#[async_trait::async_trait(?Send)]
impl<R: Runtime> Task for IndexAllApplicationsTask<R> {
    fn search_source_id(&self) -> &'static str {
        APPLICATION_SEARCH_SOURCE_ID
    }

    async fn exec(&mut self, state: &mut Option<Box<dyn SearchSourceState>>) {
        let callback = self.callback.take().unwrap();
        let mut app_index_dir = self
            .tauri_app_handle
            .path()
            .app_data_dir()
            .expect("failed to find the local dir");
        app_index_dir.push("local_application_index");

        let index_exists = app_index_dir.exists();

        let mut pizza_engine_builder = EngineBuilder::new();
        let disk_store = task_exec_try!(DiskStore::new(&app_index_dir), callback);
        pizza_engine_builder.set_data_store(disk_store);

        let mut schema = Schema::new();
        let field_app_name = Property::builder(FieldType::Text).build();
        schema
            .add_property(FIELD_APP_NAME, field_app_name)
            .expect("no collision could happen");
        let property_icon = Property::builder(FieldType::Text).index(false).build();
        schema
            .add_property(FIELD_ICON_PATH, property_icon)
            .expect("no collision could happen");
        schema
            .add_property(FIELD_APP_ALIAS, Property::as_text(None))
            .expect("no collision could happen");
        schema.freeze();
        pizza_engine_builder.set_schema(schema);

        let pizza_engine = pizza_engine_builder
            .build()
            .unwrap_or_else(|e| panic!("failed to build Pizza engine due to [{}]", e));
        pizza_engine.start();
        let mut writer = pizza_engine.acquire_writer();

        if !index_exists {
            let default_search_path = get_default_search_paths();
            let apps = task_exec_try!(list_app_in(default_search_path), callback);

            for app in apps.iter() {
                let app_path = get_app_path(app);
                let app_name = get_app_name(app).await;
                let app_icon_path = task_exec_try!(
                    get_app_icon_path(&self.tauri_app_handle, app).await,
                    callback
                );
                // Every app has an empty alias by default
                let app_alias = String::new();

                if app_name.is_empty() || app_name.eq(&self.tauri_app_handle.package_info().name) {
                    continue;
                }

                let document = doc!( app_path,  {
                    FIELD_APP_NAME => app_name,
                    FIELD_ICON_PATH => app_icon_path,
                    FIELD_APP_ALIAS => app_alias,
                  }
                );

                task_exec_try!(writer.create_document(document).await, callback);
            }

            task_exec_try!(writer.commit(), callback);
        }

        let snapshot = pizza_engine.create_snapshot();
        let searcher = pizza_engine.acquire_searcher();

        let state_to_store = Box::new(ApplicationSearchSourceState {
            searcher,
            snapshot,
            engine: pizza_engine,
            writer,
        }) as Box<dyn SearchSourceState>;

        *state = Some(state_to_store);

        callback.send(Ok(())).unwrap();
    }
}

struct SearchApplicationsTask<R: Runtime> {
    tauri_app_handle: AppHandle<R>,
    query_string: String,
    callback: Option<OneshotSender<Result<SearchResult, PizzaEngineError>>>,
}

#[async_trait::async_trait(?Send)]
impl<R: Runtime> Task for SearchApplicationsTask<R> {
    fn search_source_id(&self) -> &'static str {
        APPLICATION_SEARCH_SOURCE_ID
    }

    async fn exec(&mut self, state: &mut Option<Box<dyn SearchSourceState>>) {
        let callback = self.callback.take().unwrap();
        let disabled_app_list = get_disabled_app_list(self.tauri_app_handle.clone());

        // TODO: search via alias, implement this when Pizza engine supports update
        let dsl = format!(
            "{{ \"query\": {{ \"bool\": {{ \"should\": [ {{ \"match\": {{ \"{FIELD_APP_NAME}\": \"{}\" }} }}, {{ \"prefix\": {{ \"{FIELD_APP_NAME}\": \"{}\" }} }} ] }} }} }}", self.query_string, self.query_string);

        let state = state
            .as_mut()
            .expect("should be set before")
            .as_mut_any()
            .downcast_mut::<ApplicationSearchSourceState>()
            .unwrap();

        let query = OriginalQuery::QueryDSL(dsl);
        let query_ctx = QueryContext::new(query, true);
        let mut search_result = match state.searcher.parse_and_query(&query_ctx, &state.snapshot) {
            Ok(search_result) => search_result,
            Err(engine_err) => {
                callback.send(Err(engine_err)).unwrap();
                return;
            }
        };

        // filter out the disabled apps
        if let Some(hits) = &mut search_result.hits {
            hits.retain(|document| {
                !disabled_app_list.contains(
                    document
                        .key
                        .as_ref()
                        .expect("every document should have a key"),
                )
            });
        }

        let rx_dropped_error = callback.send(Ok(search_result)).is_err();
        if rx_dropped_error {
            warn!("failed to send local app search result back because the corresponding channel receiver end has been unexpected dropped, which could happen due to a low query timeout")
        }
    }
}

struct GetApplicationsTask {
    callback: Option<OneshotSender<Result<Option<Vec<PizzaEngineDocument>>, PizzaEngineError>>>,
}

#[async_trait(?Send)]
impl Task for GetApplicationsTask {
    fn search_source_id(&self) -> &'static str {
        APPLICATION_SEARCH_SOURCE_ID
    }

    async fn exec(&mut self, state: &mut Option<Box<dyn SearchSourceState>>) {
        let callback = self.callback.take().unwrap();

        // `size` is set to 100_000, it should be a reasonable value
        let dsl = r#"{
        "size": 100000,
        "query": {
          "match_all": { }
        }
      }"#;

        let state = state
            .as_mut()
            .expect("should be set before")
            .as_mut_any()
            .downcast_mut::<ApplicationSearchSourceState>()
            .unwrap();

        let query = OriginalQuery::QueryDSL(dsl.into());
        let query_ctx = QueryContext::new(query, true);
        let search_result = match state.searcher.parse_and_query(&query_ctx, &state.snapshot) {
            Ok(search_result) => search_result,
            Err(engine_err) => {
                callback.send(Err(engine_err)).unwrap();
                return;
            }
        };
        let hits = search_result.hits;

        callback.send(Ok(hits)).unwrap();
    }
}

/// When
/// 1. App list watcher reports that there are some newly-installed applications
/// 2. New search paths have been added by the user
///
/// We use this task to index them.
struct IndexNewApplicationsTask {
    applications: Vec<PizzaEngineDraftDoc>,
    callback: Option<tokio::sync::oneshot::Sender<Result<(), String>>>,
}

#[async_trait(?Send)]
impl Task for IndexNewApplicationsTask {
    fn search_source_id(&self) -> &'static str {
        APPLICATION_SEARCH_SOURCE_ID
    }

    async fn exec(&mut self, state: &mut Option<Box<dyn SearchSourceState>>) {
        let callback = self
            .callback
            .take()
            .expect("callback not set or exec has been invoked multiple times");
        let state = state
            .as_mut()
            .expect("should be set before")
            .as_mut_any()
            .downcast_mut::<ApplicationSearchSourceState>()
            .unwrap();

        let writer = &mut state.writer;

        for app_document in std::mem::take(&mut self.applications) {
            task_exec_try!(writer.create_document(app_document).await, callback);
        }

        task_exec_try!(writer.commit(), callback);

        state.snapshot = state.engine.create_snapshot();

        callback.send(Ok(())).expect("rx dropped");
    }
}

pub struct ApplicationSearchSource;

impl ApplicationSearchSource {
    pub async fn init<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let index_applications_task = IndexAllApplicationsTask {
            tauri_app_handle: app_handle.clone(),
            callback: Some(tx),
        };

        RUNTIME_TX
            .get()
            .unwrap()
            .send(Box::new(index_applications_task))
            .unwrap();

        rx.await.unwrap()?;

        app_handle
            .store(TAURI_STORE_APP_HOTKEY)
            .map_err(|e| e.to_string())?;
        let disabled_app_list_and_search_path_store = app_handle
            .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
            .map_err(|e| e.to_string())?;
        if disabled_app_list_and_search_path_store
            .get(TAURI_STORE_KEY_DISABLED_APP_LIST)
            .is_none()
        {
            disabled_app_list_and_search_path_store
                .set(TAURI_STORE_KEY_DISABLED_APP_LIST, Json::Array(Vec::new()));
        }

        if disabled_app_list_and_search_path_store
            .get(TAURI_STORE_KEY_SEARCH_PATH)
            .is_none()
        {
            let default_search_path = get_default_search_paths();
            disabled_app_list_and_search_path_store
                .set(TAURI_STORE_KEY_SEARCH_PATH, default_search_path);
        }

        register_app_hotkey_upon_start(app_handle.clone())?;

        let app_handle_clone = app_handle.clone();
        std::thread::Builder::new()
            .name("local app search - app list synchronizer".into())
            .spawn(move || {
                let tokio_rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("failed to start a tokio runtime");

                tokio_rt.block_on(async move {
                    info!("app list synchronizer started");
                    loop {
                        tokio::time::sleep(std::time::Duration::from_secs(60 * 2)).await;
                        debug!("app list synchronizer working");

                        let stored_app_list = get_app_list(app_handle_clone.clone())
                            .await
                            .expect("failed to fetch the stored app list");
                        let store = app_handle_clone
                            .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
                            .unwrap_or_else(|_e| {
                                panic!(
                                    "store [{}] not found/loaded",
                                    TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH
                                )
                            });
                        let search_path_json =
                            store.get(TAURI_STORE_KEY_SEARCH_PATH).unwrap_or_else(|| {
                                panic!("key [{}] not found", TAURI_STORE_KEY_SEARCH_PATH)
                            });
                        let search_paths: Vec<String> = match search_path_json {
                            Json::Array(array) => array
                                .into_iter()
                                .map(|json| match json {
                                    Json::String(str) => str,
                                    _ => unreachable!("search path should be a string"),
                                })
                                .collect(),
                            _ => unreachable!("search paths should be stored in an array"),
                        };
                        let mut current_app_list = list_app_in(search_paths).unwrap_or_else(|e| {
                            panic!("failed to fetch app list due to error [{}]", e)
                        });
                        // filter out Coco-AI
                        current_app_list.retain(|app| app.name != app_handle.package_info().name);

                        let current_app_list_path_hash_index = {
                            let mut index = HashMap::new();
                            for (idx, app) in current_app_list.iter().enumerate() {
                                index.insert(get_app_path(app), idx);
                            }

                            index
                        };
                        let current_app_path_list: HashSet<String> =
                            current_app_list.iter().map(get_app_path).collect();
                        let stored_app_path_list: HashSet<String> = stored_app_list
                            .iter()
                            .map(|app_entry| app_entry.path.clone())
                            .collect();

                        let new_apps = current_app_path_list.difference(&stored_app_path_list);
                        debug!("found new apps [{:?}]", new_apps);

                        // Synchronize the stored app list
                        let mut new_apps_pizza_engine_documents = Vec::new();

                        // Inform the frontend
                        let mut new_app_entries = Vec::new();

                        for new_app_path in new_apps {
                            let idx = *current_app_list_path_hash_index.get(new_app_path).unwrap();
                            let new_app = current_app_list.get(idx).unwrap();
                            let new_app_name = get_app_name(new_app).await;
                            let new_app_icon_path =
                                get_app_icon_path(&app_handle_clone, new_app).await.unwrap();
                            let new_app_alias = String::new();

                            let new_app_entry = AppEntry {
                                path: new_app_path.clone(),
                                name: new_app_name.clone(),
                                icon_path: new_app_icon_path.clone(),
                                alias: new_app_alias.clone(),
                                hotkey: String::new(),
                                is_disabled: false,
                            };

                            let new_app_pizza_engine_document = doc!(new_app_path.clone(),  {
                                FIELD_APP_NAME => new_app_name,
                                FIELD_ICON_PATH => new_app_icon_path,
                                FIELD_APP_ALIAS => new_app_alias,
                              }
                            );

                            new_apps_pizza_engine_documents.push(new_app_pizza_engine_document);
                            new_app_entries.push(new_app_entry);
                        }

                        // NOTE: always update the backend data before sending events to
                        // the frontend, or the backend could receive requests that manipulate
                        // the data that does not exist.
                        let (callback, wait_for_complete) = tokio::sync::oneshot::channel();
                        let index_new_apps_task = Box::new(IndexNewApplicationsTask {
                            applications: new_apps_pizza_engine_documents,
                            callback: Some(callback),
                        });
                        RUNTIME_TX
                            .get()
                            .unwrap()
                            .send(index_new_apps_task)
                            .expect("rx dropped, pizza runtime could possibly be dead");
                        wait_for_complete
                            .await
                            .expect("tx dropped, pizza runtime could possibly be dead")
                            .unwrap_or_else(|e| {
                                panic!("failed to index new apps due to error [{}]", e)
                            });

                        app_handle_clone.emit("new-apps", new_app_entries).unwrap();
                    }
                });
            })
            .unwrap();

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

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError> {
        let query_string = query
            .query_strings
            .get("query")
            .unwrap_or(&"".to_string())
            .to_lowercase();

        if query_string.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        }

        let (tx, rx) = tokio::sync::oneshot::channel();
        let task = SearchApplicationsTask {
            tauri_app_handle: GLOBAL_TAURI_APP_HANDLE
                .get()
                .expect("global tauri app handle not initialized")
                .clone(),
            query_string,
            callback: Some(tx),
        };

        RUNTIME_TX
            .get()
            .unwrap()
            .send(Box::new(task))
            .expect("rx dropped, the runtime thread is possibly dead");

        let search_result = rx
            .await
            .expect("tx dropped, the runtime thread is possibly dead")
            .map_err(|pizza_engine_err| {
                let err_str = pizza_engine_err.to_string();
                SearchError::InternalError(err_str)
            })?;

        let total_hits = search_result.total_hits;
        let source = self.get_type();
        let hits = pizza_engine_hits_to_coco_hits(search_result.hits);

        Ok(QueryResponse {
            source,
            hits,
            total_hits,
        })
    }
}

fn pizza_engine_hits_to_coco_hits(
    pizza_engine_hits: Option<Vec<PizzaEngineDocument>>,
) -> Vec<(Document, f64)> {
    let Some(engine_hits) = pizza_engine_hits else {
        return Vec::new();
    };

    let mut coco_hits = Vec::new();
    for engine_hit in engine_hits {
        let score = engine_hit.score.unwrap_or(0.0) as f64;
        let mut document_fields = engine_hit.fields;
        let app_name = match document_fields.remove(FIELD_APP_NAME).unwrap() {
            FieldValue::Text(string) => string,
            _ => unreachable!("field name is of type Text"),
        };
        let app_path = engine_hit.key.expect("key should be set to app path");
        let app_icon_path = match document_fields.remove(FIELD_ICON_PATH).unwrap() {
            FieldValue::Text(string) => string,
            _ => unreachable!("field icon is of type Text"),
        };

        let coco_document = Document {
            source: Some(DataSourceReference {
                r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                name: Some(QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME.into()),
                id: Some(QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME.into()),
                icon: None,
            }),
            id: app_path.clone(),
            category: Some("Application".to_string()),
            title: Some(app_name.clone()),
            url: Some(app_path),
            icon: Some(app_icon_path),

            ..Default::default()
        };

        coco_hits.push((coco_document, score));
    }

    coco_hits
}

#[tauri::command]
pub async fn set_app_alias(_app_path: String, _alias: String) -> Result<(), String> {
    unimplemented!("until Pizza-engine supports update")
}

fn register_app_hotkey_upon_start<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
) -> Result<(), String> {
    let app_hotkey_store = tauri_app_handle
        .store(TAURI_STORE_APP_HOTKEY)
        .unwrap_or_else(|_| panic!("store [{}] not found/loaded", TAURI_STORE_APP_HOTKEY));

    for (app_path, hotkey) in app_hotkey_store.entries() {
        let hotkey = match hotkey {
            Json::String(str) => str,
            _ => unreachable!("hotkey should be stored in a string"),
        };

        tauri_app_handle
            .global_shortcut()
            .on_shortcut(
                hotkey.as_str(),
                move |tauri_app_handle, _hot_key, _event| {
                    let app_path_clone = app_path.clone();
                    let tauri_app_handle_clone = tauri_app_handle.clone();
                    // This closure will be executed on the main thread, so we spawn to reduce the potential UI lag.
                    async_runtime::spawn(async move {
                        if let Err(e) = open(tauri_app_handle_clone, app_path_clone).await {
                            warn!("failed to open app due to [{}]", e);
                        }
                    });
                },
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn register_app_hotkey<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    app_path: String,
    hotkey: String,
) -> Result<(), String> {
    let app_hotkey_store = tauri_app_handle
        .store(TAURI_STORE_APP_HOTKEY)
        .unwrap_or_else(|_| panic!("store [{}] not found/loaded", TAURI_STORE_APP_HOTKEY));

    app_hotkey_store.set(app_path.clone(), hotkey.as_str());

    tauri_app_handle
        .global_shortcut()
        .on_shortcut(
            hotkey.as_str(),
            move |tauri_app_handle, _hot_key, _event| {
                let app_path_clone = app_path.clone();
                let tauri_app_handle_clone = tauri_app_handle.clone();
                // This closure will be executed on the main thread, so we spawn to reduce the potential UI lag.
                async_runtime::spawn(async move {
                    if let Err(e) = open(tauri_app_handle_clone, app_path_clone).await {
                        warn!("failed to open app due to [{}]", e);
                    }
                });
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn unregister_app_hotkey<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    app_path: String,
) -> Result<(), String> {
    let app_hotkey_store = tauri_app_handle
        .store(TAURI_STORE_APP_HOTKEY)
        .unwrap_or_else(|_| panic!("store [{}] not found/loaded", TAURI_STORE_APP_HOTKEY));

    let Some(hotkey) = app_hotkey_store.get(app_path.as_str()) else {
        let error_msg = format!(
            "unregister an Application hotkey that does not exist app: [{}]",
            app_path,
        );
        warn!("{}", error_msg);
        return Err(error_msg);
    };

    let hotkey = match hotkey {
        Json::String(str) => str,
        _ => unreachable!("hotkey should be stored in a string"),
    };

    let deleted = app_hotkey_store.delete(app_path.as_str());
    if !deleted {
        return Err("failed to delete application hotkey from store".into());
    }

    tauri_app_handle
        .global_shortcut()
        .unregister(hotkey.as_str())
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn get_disabled_app_list<R: Runtime>(tauri_app_handle: AppHandle<R>) -> Vec<String> {
    let store = tauri_app_handle
        .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
        .unwrap_or_else(|_| {
            panic!(
                "tauri store [{}] not found/loaded",
                TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH
            )
        });
    let disabled_app_list_json = store
        .get(TAURI_STORE_KEY_DISABLED_APP_LIST)
        .unwrap_or_else(|| panic!("key [{}] not found", TAURI_STORE_KEY_DISABLED_APP_LIST));

    let disabled_app_list: Vec<String> = match disabled_app_list_json {
        Json::Array(a) => a
            .into_iter()
            .map(|json| match json {
                Json::String(s) => s,
                _ => unreachable!("app_path is stored in a string"),
            })
            .collect(),
        _ => unreachable!("disabled app list is stored in an array"),
    };

    disabled_app_list
}

#[tauri::command]
pub async fn disable_app_search<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    app_path: String,
) -> Result<(), String> {
    let store = tauri_app_handle
        .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
        .unwrap_or_else(|_| {
            panic!(
                "tauri store [{}] not found/loaded",
                TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH
            )
        });

    let mut disabled_app_list = get_disabled_app_list(tauri_app_handle);

    if disabled_app_list.contains(&app_path) {
        return Err(format!(
            "trying to disable an app that is disabled [{}]",
            app_path
        ));
    }

    disabled_app_list.push(app_path);

    store.set(TAURI_STORE_KEY_DISABLED_APP_LIST, disabled_app_list);

    Ok(())
}

#[tauri::command]
pub async fn enable_app_search<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    app_path: String,
) -> Result<(), String> {
    let store = tauri_app_handle
        .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
        .unwrap_or_else(|_| {
            panic!(
                "tauri store [{}] not found/loaded",
                TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH
            )
        });

    let mut disabled_app_list = get_disabled_app_list(tauri_app_handle);

    match disabled_app_list
        .iter()
        .position(|app_path_str| app_path_str == &app_path)
    {
        Some(index) => {
            disabled_app_list.remove(index);
            store.set(TAURI_STORE_KEY_DISABLED_APP_LIST, disabled_app_list);

            Ok(())
        }
        None => Err(format!(
            "trying to enable an app that is not disabled [{}]",
            app_path
        )),
    }
}

#[tauri::command]
pub async fn add_app_search_path<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    search_path: String,
) -> Result<(), String> {
    let mut search_paths = get_app_search_path(tauri_app_handle.clone()).await;
    if search_paths.contains(&search_path) {
        return Ok(());
    }

    search_paths.push(search_path);

    let store = tauri_app_handle
        .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
        .unwrap_or_else(|_| {
            panic!(
                "store [{}] not found/loaded",
                TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH
            )
        });

    store.set(TAURI_STORE_KEY_SEARCH_PATH, search_paths);

    Ok(())
}

#[tauri::command]
pub async fn remove_app_search_path<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    search_path: String,
) -> Result<(), String> {
    let mut search_paths = get_app_search_path(tauri_app_handle.clone()).await;
    let opt_index = search_paths.iter().position(|path| path == &search_path);
    let Some(index) = opt_index else {
        return Ok(());
    };

    search_paths.remove(index);
    let store = tauri_app_handle
        .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
        .unwrap_or_else(|_| {
            panic!(
                "store [{}] not found/loaded",
                TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH
            )
        });

    store.set(TAURI_STORE_KEY_SEARCH_PATH, search_paths);

    Ok(())
}

#[tauri::command]
pub async fn get_app_search_path<R: Runtime>(tauri_app_handle: AppHandle<R>) -> Vec<String> {
    let store = tauri_app_handle
        .store(TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH)
        .unwrap_or_else(|_| {
            panic!(
                "store [{}] not found/loaded",
                TAURI_STORE_DISABLED_APP_LIST_AND_SEARCH_PATH
            )
        });

    let search_path_json = store
        .get(TAURI_STORE_KEY_SEARCH_PATH)
        .unwrap_or_else(|| panic!("key [{}] not found", TAURI_STORE_KEY_SEARCH_PATH));

    let search_path: Vec<String> = match search_path_json {
        Json::Array(array) => array
            .into_iter()
            .map(|json| match json {
                Json::String(str) => str,
                _ => unreachable!("search path is stored in a string"),
            })
            .collect(),
        _ => unreachable!("search path is stored in an array"),
    };

    search_path
}

#[tauri::command]
pub async fn get_app_list<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
) -> Result<Vec<AppEntry>, String> {
    let (callback, wait_for_result) = tokio::sync::oneshot::channel();

    let get_applications_task = Box::new(GetApplicationsTask {
        callback: Some(callback),
    });
    RUNTIME_TX
        .get()
        .unwrap()
        .send(get_applications_task)
        .unwrap();

    let opt_pizza_engine_documents = wait_for_result.await.unwrap().map_err(|e| e.to_string())?;

    let Some(pizza_engine_documents) = opt_pizza_engine_documents else {
        return Ok(Vec::new());
    };

    let app_hotkey_store = tauri_app_handle
        .store(TAURI_STORE_APP_HOTKEY)
        .unwrap_or_else(|_| panic!("tauri store [{}] not found/loaded", TAURI_STORE_APP_HOTKEY));
    let disabled_app_list = get_disabled_app_list(tauri_app_handle);

    let mut app_entries = Vec::with_capacity(pizza_engine_documents.len());

    for pizza_engine_document in pizza_engine_documents {
        let mut fields = pizza_engine_document.fields;

        let path = pizza_engine_document
            .key
            .expect("key should be set to app_path");
        let name = match fields
            .remove(FIELD_APP_NAME)
            .unwrap_or_else(|| panic!("field [{}] not found", FIELD_APP_NAME))
        {
            FieldValue::Text(str) => str,
            _ => unreachable!("app name is stored in a string"),
        };
        let icon_path = match fields
            .remove(FIELD_ICON_PATH)
            .unwrap_or_else(|| panic!("field [{}] not found", FIELD_ICON_PATH))
        {
            FieldValue::Text(str) => str,
            _ => unreachable!("app icon path is stored in a string"),
        };
        let alias = match fields
            .remove(FIELD_APP_ALIAS)
            .unwrap_or_else(|| panic!("field [{}] not found", FIELD_APP_ALIAS))
        {
            FieldValue::Text(str) => str,
            _ => unreachable!("app alias is stored in a string"),
        };
        let hotkey = app_hotkey_store
            .get(&path)
            .map(|json| match json {
                Json::String(str) => str,
                _ => unreachable!("app hotkey is stored in a string"),
            })
            // If a hotkey is not set, we use an empty string
            .unwrap_or(String::new());
        let is_disabled = disabled_app_list.contains(&path);

        let app_entry = AppEntry {
            path,
            name,
            icon_path,
            alias,
            hotkey,
            is_disabled,
        };

        app_entries.push(app_entry);
    }

    Ok(app_entries)
}

#[tauri::command]
pub async fn get_app_metadata<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    app_path: String,
) -> Result<AppMetadata, String> {
    let app =
        App::from_path(std::path::Path::new(&app_path)).expect("frontend sends an invalid app");

    let app_path = get_app_path(&app);
    let app_name = get_app_name(&app).await;
    let app_path_where = {
        let app_path_borrowed_path = std::path::Path::new(app_path.as_str());
        let app_path_where = app_path_borrowed_path
            .parent()
            .expect("every app file should live somewhere");

        app_path_where
            .to_str()
            .expect("it is guaranteed to be UTF-8 encoded")
            .to_string()
    };
    let icon = get_app_icon_path(&tauri_app_handle, &app).await?;

    let raw_app_metadata = metadata(app_path.into(), None).await?;

    let app_exe_path = app
        .app_path_exe
        .as_ref()
        .expect("exe path should be Some")
        .clone();
    let raw_app_exe_metadata = metadata(app_exe_path, None).await?;

    Ok(AppMetadata {
        name: app_name,
        r#where: app_path_where,
        size: raw_app_metadata.size,
        icon,
        created: raw_app_metadata.created_at,
        modified: raw_app_metadata.modified_at,
        last_opened: raw_app_exe_metadata.accessed_at,
    })
}
