use super::RUNTIME_TX;

use crate::common::document::{DataSourceReference, Document};
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::{SearchError, SearchSource};
use crate::local::LOCAL_QUERY_SOURCE_TYPE;
use async_trait::async_trait;
use futures::TryFutureExt;
use pizza_engine::document::{
    Document as PizzaEngineDocument, FieldType, FieldValue, Property, Schema,
};

use pizza_engine::error::PizzaEngineError;
use pizza_engine::search::{OriginalQuery, QueryContext, SearchResult, Searcher};
use pizza_engine::store::{DiskStore, DiskStoreSnapshot};
use pizza_engine::{doc, EngineBuilder};
use std::path::Path;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
use tokio::sync::oneshot::Sender as OneshotSender;

use tokio::fs;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::{Stream, StreamExt};

pub const LOCAL_DISK_STORE_PATH: &str = "filesystem_index";
const FIELD_FS_START_NAME: &str = "fs_start_name";
const FIELD_FS_START_PATH: &str = "fs_start_path";
const FIELD_FS_ICON_PATH: &str = "fs_icon_path";
const FS_SEARCH_SOURCE_ID: &str = "filesystem";

struct FileSystemSearchSourceState {
    snapshot: DiskStoreSnapshot,
    searcher: Searcher<DiskStore>,
}

impl super::SearchSourceState for FileSystemSearchSourceState {
    fn as_mut_any(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

struct IndexFSTask<R: Runtime> {
    tauri_app_handle: AppHandle<R>,
    callback: Option<tokio::sync::oneshot::Sender<Result<(), String>>>,
}

impl<R: Runtime> IndexFSTask<R> {
    async fn write_all_filenames_oneshot(
        engine: &pizza_engine::Engine<DiskStore>,
    ) -> Result<(), String> {
        let mut writer = engine.acquire_writer();
        let fs_files: Vec<String> = Self::get_all_filenames_oneshot().await?;

        //let mut doc_id = 0;
        for (doc_id, file_str) in fs_files.iter().enumerate() {
            let document_id = doc_id as u32;
            let filename = file_str.clone();
            let filepath = file_str.clone();
            let document = doc!( document_id, {
                FIELD_FS_START_NAME => filename,
                FIELD_FS_START_PATH => filepath,
              }
            );

            let _ = writer.create_document(document).await;
        }

        writer.commit().map_err(|err| err.to_string())?;

        Ok(())
    }

    fn create_disk_store(path: &Path) -> Result<DiskStore, String> {
        let store = DiskStore::new(path).map_err(|op| format!("{}", op))?;

        Ok(store)
    }

    fn get_file_search_start() -> PathBuf {
        // get home dir of current user
        let home_dir = std::env::var("HOME").unwrap();
        let home_path = PathBuf::from(home_dir);
        let root_fs = if cfg!(target_os = "linux") {
            //home_path.join("Documents")
            //home_path.join("git");
            PathBuf::from("/")
        } else if cfg!(target_os = "windows") {
            todo!()
        } else {
            todo!()
        };

        root_fs
    }

    async fn write_all_filenames(engine: &pizza_engine::Engine<DiskStore>) -> Result<(), String> {
        let mut file_stream = Self::list_files_recursive(Self::get_file_search_start(), 6);

        let mut writer = engine.acquire_writer();
        let mut doc_id = 0;
        while let Some(file_result) = file_stream.next().await {
            match file_result {
                Ok(path) => {
                    doc_id += 1;
                    let file_str: String = path.to_string_lossy().into();
                    let document_id = doc_id as u32;
                    let filename = file_str.clone();
                    let filepath = file_str.clone();
                    let document = doc!( document_id, {
                        FIELD_FS_START_NAME => filename,
                        FIELD_FS_START_PATH => filepath,
                      }
                    );

                    let _ = writer.create_document(document).await;
                }
                Err(e) => eprintln!("Error: {:?}", e),
            }

            if doc_id % 100000 == 0 {
                writer.commit().map_err(|err| err.to_string())?;
                eprintln!(
                    "Indexing files on file system, there are '{doc_id}' documents committed"
                );
            }
        }

        writer.commit().map_err(|err| err.to_string())?;

        Ok(())
    }

    pub fn list_files_recursive(
        root: PathBuf,
        max_depth: usize,
    ) -> impl Stream<Item = Result<PathBuf, std::io::Error>> {
        let (tx, rx) = mpsc::channel(100);
        tokio::spawn(async move {
            if let Err(e) = Self::walk(root, max_depth, tx).await {
                eprintln!("walk error: {:?}", e);
            }
        });
        ReceiverStream::new(rx)
    }

    async fn walk(
        path: PathBuf,
        max_depth: usize,
        tx: mpsc::Sender<Result<PathBuf, std::io::Error>>,
    ) -> Result<(), std::io::Error> {
        if max_depth == 0 {
            return Ok(());
        }

        let mut entries = fs::read_dir(&path).await?;
        loop {
            match entries.next_entry().await {
                Ok(entry_option) => {
                    if let Some(entry) = entry_option {
                        let entry_path = entry.path();
                        if entry_path.is_dir() {
                            // when walk error for subdirectory just ignore. For example: permisson denied
                            let _error =
                                Box::pin(Self::walk(entry_path.clone(), max_depth - 1, tx.clone()))
                                    .await;
                        } else {
                            if let Err(err) = tx.send(Ok(entry_path)).await {
                                eprintln!("fs walk send entry error: {err:?}");
                                break;
                            }
                        }
                    } else {
                        break;
                    }
                }
                Err(_err) => {}
            }
        }
        Ok(())
    }

    async fn get_all_filenames_oneshot() -> Result<Vec<String>, String> {
        // get home dir of current user
        let home_dir = std::env::var("HOME").unwrap();
        let home_path = PathBuf::from(home_dir);
        let root_fs = if cfg!(target_os = "linux") {
            home_path.join("Documents")
        } else if cfg!(target_os = "windows") {
            todo!()
        } else {
            todo!()
        };

        let files = Self::list_files_recursive_oneshot(&root_fs)
            .map_err(|err| err.to_string())
            .await?;

        Ok(files
            .iter()
            .map(|path| path.to_string_lossy().into())
            .collect())
    }

    async fn list_files_recursive_oneshot(path: &PathBuf) -> Result<Vec<PathBuf>, std::io::Error> {
        async fn list_files_recursive_inner(
            path: &PathBuf,
        ) -> Result<Vec<PathBuf>, std::io::Error> {
            let mut entries = tokio::fs::read_dir(path).await?;
            let mut file_paths = Vec::new();

            while let Some(entry) = entries.next_entry().await? {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    let subdir_paths = Box::pin(list_files_recursive_inner(&entry_path)).await?;
                    file_paths.extend(subdir_paths);
                } else {
                    file_paths.push(entry_path);
                }
            }

            Ok(file_paths)
        }

        Box::pin(list_files_recursive_inner(path)).await
    }
}

#[async_trait::async_trait(?Send)]
impl<R: Runtime> super::Task for IndexFSTask<R> {
    fn search_source_id(&self) -> &'static str {
        FS_SEARCH_SOURCE_ID
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
        let fs_index_dir = self
            .tauri_app_handle
            .path()
            .app_data_dir()
            .expect("failed to find the applicate local data directory")
            .join(LOCAL_DISK_STORE_PATH);

        let index_exists = fs_index_dir.exists();

        let fs_disk_store = my_try!(Self::create_disk_store(&fs_index_dir), callback);
        let mut builder = EngineBuilder::new();
        builder.set_data_store(fs_disk_store);

        let mut schema = Schema::new();
        let text_property = my_try!(
            Property::as_text(None).map_err(|op| format!("{:?}", op)),
            callback
        );
        schema
            .add_property(FIELD_FS_START_NAME, text_property)
            .expect("no collision should happen");

        let property_fs_path = Property::builder(FieldType::Text).index(false).build();
        schema
            .add_property(FIELD_FS_START_PATH, property_fs_path)
            .expect("no collision could happen");
        let property_icon = Property::builder(FieldType::Text).index(false).build();
        schema
            .add_property(FIELD_FS_ICON_PATH, property_icon)
            .expect("no collision could happen");
        schema.freeze();
        builder.set_schema(schema);
        let engine = builder.build();
        engine.start();

        if !index_exists {
            my_try!(Self::write_all_filenames(&engine).await, callback);
        }

        let snapshot = engine.create_snapshot();
        let searcher = engine.acquire_searcher();

        let this = FileSystemSearchSourceState { snapshot, searcher };

        let state_to_store = Box::new(this) as Box<dyn super::SearchSourceState>;

        *state = Some(state_to_store);

        callback.send(Ok(())).unwrap();
    }
}

struct SearchFSTask {
    query_string: String,
    callback: Option<OneshotSender<Result<SearchResult, PizzaEngineError>>>,
}

#[async_trait::async_trait(?Send)]
impl super::Task for SearchFSTask {
    fn search_source_id(&self) -> &'static str {
        FS_SEARCH_SOURCE_ID
    }

    async fn exec(&mut self, state: &mut Option<Box<dyn super::SearchSourceState>>) {
        let callback = self.callback.take().unwrap();

        let state = state
            .as_mut()
            .expect("should be set before")
            .as_mut_any()
            .downcast_mut::<FileSystemSearchSourceState>()
            .unwrap();

        let dsl = format!(
            r#"{{
              "query": {{
                "bool": {{
                  "should": [
                              {{ "match": {{ "{FIELD_FS_START_NAME}": "{}" }} }}, 
                              {{ "prefix": {{ "{FIELD_FS_START_NAME}": "{}" }} }}
                            ]
                        }}
                      }}
              }}"#,
            self.query_string, self.query_string
        );

        let mut result = match state.searcher.parse_and_query(
            &QueryContext::new(OriginalQuery::QueryDSL(dsl), true),
            &state.snapshot,
        ) {
            Ok(search_result) => search_result,
            Err(engine_err) => {
                callback.send(Err(engine_err)).unwrap();
                return;
            }
        };

        let result_str = result.to_string();
        let mut count = 0;
        if let Some(v) = &mut result.hits {
            if v.len() > 100 {
                v.truncate(100);
            }

            count = v.len();
        }
        eprintln!(
            "the result count before send: {:?}, now: {count}",
            result_str.len()
        );

        if let Err(err) = callback.send(Ok(result)) {
            let mut err_str = format!("{:?}", err);
            if err_str.len() > 1000 {
                err_str.truncate(1000);
            }

            eprintln!("callback send failed: {:?}", err_str);
        }
    }
}

pub struct FileSystemSearchSource;

impl FileSystemSearchSource {
    pub async fn new<R: Runtime>(app_handle: AppHandle<R>) -> Result<Self, String> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let index_fs_task = IndexFSTask {
            tauri_app_handle: app_handle.clone(),
            callback: Some(tx),
        };

        if let Err(err) = super::RUNTIME_TX
            .get()
            .unwrap()
            .send(Box::new(index_fs_task))
        {
            let mut err_str = err.to_string();
            if err_str.len() > 100 {
                err_str.truncate(100);
            }
            eprintln!("send task failed: {:?}", err_str);
        }

        rx.await.unwrap()?;

        Ok(Self)
    }
}

#[async_trait]
impl SearchSource for FileSystemSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or("My Computer".into())
                .to_string_lossy()
                .into(),
            id: "local_filesystem".into(),
        }
    }

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError> {
        eprintln!("search begin");
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
        let task = SearchFSTask {
            query_string,
            callback: Some(tx),
        };

        RUNTIME_TX
            .get()
            .unwrap()
            .send(Box::new(task))
            .expect("failed to send");

        let result = rx.await.unwrap().map_err(|pizza_engine_err| {
            let err_str = pizza_engine_err.to_string();
            SearchError::InternalError(err_str)
        })?;

        let total_hits = result.total_hits;
        let hits = pizza_engine_hits_to_coco_hits(result.hits);

        Ok(QueryResponse {
            source: self.get_type(),
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
        let app_name = match document_fields.remove(FIELD_FS_START_NAME).unwrap() {
            FieldValue::Text(string) => string,
            _ => unreachable!("field name is of type Text"),
        };
        let app_path = match document_fields.remove(FIELD_FS_START_PATH).unwrap() {
            FieldValue::Text(string) => string,
            _ => unreachable!("field name is of type Text"),
        };

        let coco_document = Document::new(
            Some(DataSourceReference {
                r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                name: Some("File System".into()),
                id: Some(app_name.clone()),
                icon: None,
            }),
            app_name.clone(),
            "Documents".to_string(),
            app_name.clone(),
            app_path,
        );

        eprint!("score: {score} ");
        coco_hits.push((coco_document, score + 1000f64));
    }

    coco_hits
}
