use super::RUNTIME_TX;
use crate::common::document::{DataSourceReference, Document};
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::{SearchError, SearchSource};
use crate::local::LOCAL_QUERY_SOURCE_TYPE;
use applications::{AppInfo, AppInfoContext};
use async_trait::async_trait;
use base64::encode;
use pizza_engine::document::FieldType;
use pizza_engine::document::{Document as PizzaEngineDocument, FieldValue};
use pizza_engine::document::{Property, Schema};
use pizza_engine::error::PizzaEngineError;
use pizza_engine::search::{OriginalQuery, QueryContext, SearchResult, Searcher};
use pizza_engine::store::{DiskStore, DiskStoreSnapshot};
use pizza_engine::{doc, EngineBuilder};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_fs_pro::{icon, name};
use tokio::sync::oneshot::Sender as OneshotSender;

const FIELD_APP_NAME: &str = "app_name";
const FIELD_APP_PATH: &str = "app_path";
const FIELD_ICON_PATH: &str = "icon_path";
const APPLICATION_SEARCH_SOURCE_ID: &str = "application";

struct ApplicationSearchSourceState {
    searcher: Searcher<DiskStore>,
    snapshot: DiskStoreSnapshot,
}

impl super::SearchSourceState for ApplicationSearchSourceState {
    fn as_mut_any(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

struct IndexApplicationsTask<R: Runtime> {
    tauri_app_handle: AppHandle<R>,
    callback: Option<tokio::sync::oneshot::Sender<Result<(), String>>>,
}

#[async_trait::async_trait(?Send)]
impl<R: Runtime> super::Task for IndexApplicationsTask<R> {
    fn search_source_id(&self) -> &'static str {
        APPLICATION_SEARCH_SOURCE_ID
    }

    async fn exec(&mut self, state: &mut Option<Box<dyn super::SearchSourceState>>) {
        macro_rules! my_try {
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

        let callback = self.callback.take().unwrap();
        let mut app_index_dir = self
            .tauri_app_handle
            .path()
            .app_data_dir()
            .expect("failed to find the local dir");
        app_index_dir.push("local_application_index");

        let index_exists = app_index_dir.exists();

        let mut pizza_engine_builder = EngineBuilder::new();
        let disk_store = my_try!(DiskStore::new(&app_index_dir), callback);
        pizza_engine_builder.set_data_store(disk_store);

        let mut schema = Schema::new();
        schema
            .add_property(
                FIELD_APP_NAME,
                Property::as_text(None).expect("analyzer is not set, should not fail"),
            )
            .expect("no collision could happen");
        let property_app_path = Property::builder(FieldType::Text).index(false).build();
        schema
            .add_property(FIELD_APP_PATH, property_app_path)
            .expect("no collision could happen");
        let property_icon = Property::builder(FieldType::Text).index(false).build();
        schema
            .add_property(FIELD_ICON_PATH, property_icon)
            .expect("no collision could happen");
        schema.freeze();
        pizza_engine_builder.set_schema(schema);

        let pizza_engine = pizza_engine_builder.build();
        pizza_engine.start();

        if !index_exists {
            let mut writer = pizza_engine.acquire_writer();

            let mut ctx = AppInfoContext::new(vec![]);
            my_try!(ctx.refresh_apps(), callback);
            let apps = ctx.get_all_apps();

            for (index, app) in apps.iter().enumerate() {
                if app.icon_path.is_none() {
                    continue;
                }

                let app_path = if cfg!(target_os = "windows") {
                    app.app_path_exe
                        .clone()
                        .unwrap_or(PathBuf::from("Path not found"))
                } else {
                    app.app_desktop_path.clone()
                };
                let app_path_str = app_path
                    .clone()
                    .into_os_string()
                    .into_string()
                    .expect("path should be UTF-8 encoded");

                let app_name = name(app_path.clone()).await;
                let app_icon_path = if cfg!(target_os = "linux") {
                    app.icon_path.clone().unwrap_or(PathBuf::from(""))
                } else {
                    my_try!(
                        icon(self.tauri_app_handle.clone(), app_path.clone(), Some(256)).await,
                        callback
                    )
                };
                let app_icon_path_str = app_icon_path
                    .into_os_string()
                    .into_string()
                    .expect("path should be UTF-8 encoded");

                if app_name.is_empty() || app_name.eq("Coco-AI") {
                    continue;
                }

                let document_id = index as u32;
                let document = doc!( document_id,  {
                    FIELD_APP_NAME => app_name,
                    FIELD_APP_PATH => app_path_str,
                    FIELD_ICON_PATH => app_icon_path_str,
                  }
                );

                my_try!(writer.create_document(document).await, callback);
            }

            my_try!(writer.commit(), callback);
        }

        let snapshot = pizza_engine.create_snapshot();
        let searcher = pizza_engine.acquire_searcher();

        let state_to_store = Box::new(ApplicationSearchSourceState { searcher, snapshot })
            as Box<dyn super::SearchSourceState>;

        *state = Some(state_to_store);

        callback.send(Ok(())).unwrap();
    }
}

struct SearchApplicationsTask {
    query_string: String,
    callback: Option<OneshotSender<Result<SearchResult, PizzaEngineError>>>,
}

#[async_trait::async_trait(?Send)]
impl super::Task for SearchApplicationsTask {
    fn search_source_id(&self) -> &'static str {
        APPLICATION_SEARCH_SOURCE_ID
    }

    async fn exec(&mut self, state: &mut Option<Box<dyn super::SearchSourceState>>) {
        let callback = self.callback.take().unwrap();

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
        let search_result = match state.searcher.parse_and_query(&query_ctx, &state.snapshot) {
            Ok(search_result) => search_result,
            Err(engine_err) => {
                callback.send(Err(engine_err)).unwrap();
                return;
            }
        };

        callback.send(Ok(search_result)).unwrap();
    }
}

pub struct ApplicationSearchSource;

impl ApplicationSearchSource {
    pub async fn new<R: Runtime>(app_handle: AppHandle<R>) -> Result<Self, String> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let index_applications_task = IndexApplicationsTask {
            tauri_app_handle: app_handle.clone(),
            callback: Some(tx),
        };

        super::RUNTIME_TX
            .get()
            .unwrap()
            .send(Box::new(index_applications_task))
            .unwrap();

        rx.await.unwrap()?;

        Ok(ApplicationSearchSource)
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
            id: "local_applications".into(),
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
            query_string,
            callback: Some(tx),
        };

        RUNTIME_TX.get().unwrap().send(Box::new(task)).unwrap();

        let search_result = rx.await.unwrap().map_err(|pizza_engine_err| {
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
        let app_path = match document_fields.remove(FIELD_APP_PATH).unwrap() {
            FieldValue::Text(string) => string,
            _ => unreachable!("field name is of type Text"),
        };
        let icon_path = match document_fields.remove(FIELD_ICON_PATH).unwrap() {
            FieldValue::Text(string) => string,
            _ => unreachable!("field icon is of type Text"),
        };

        let mut coco_document = Document::new(
            Some(DataSourceReference {
                r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                name: Some("Applications".into()),
                id: Some(app_name.clone()),
                icon: None,
            }),
            app_name.clone(),
            "Application".to_string(),
            app_name.clone(),
            app_path,
        );

        if let Ok(icon_data) = read_icon_and_encode(&icon_path) {
            coco_document.icon = Some(format!("data:image/png;base64,{}", icon_data));
        }

        coco_hits.push((coco_document, score));
    }

    coco_hits
}

// Function to read the icon file and convert it to base64
fn read_icon_and_encode<P: AsRef<Path>>(icon_path: &P) -> Result<String, std::io::Error> {
    // Read the icon file as binary data
    let icon_data = std::fs::read(icon_path)?;

    // Encode the data to base64
    Ok(encode(&icon_data))
}