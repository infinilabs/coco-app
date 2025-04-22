use crate::common::document::{DataSourceReference, Document};
use crate::common::error::SearchError;
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::SearchSource;
use crate::local::LOCAL_QUERY_SOURCE_TYPE;
use applications::App;
use async_trait::async_trait;
use fuzzy_prefix_search::Trie;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Runtime};
use tauri_plugin_fs_pro::{icon, metadata, name, IconOptions};

const DATA_SOURCE_ID: &str = "Applications";

#[tauri::command]
pub fn get_default_search_paths() -> Vec<String> {
    #[cfg(target_os = "macos")]
    return vec![
        "/Applications".into(),
        "/System/Applications".into(),
        "/System/Library/CoreServices".into(),
    ];

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
fn get_app_path(app: &App) -> PathBuf {
    if cfg!(target_os = "windows") {
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
    }
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
        name(app_path.clone()).await
    }
}

/// Helper function to return an absolute path to `app`'s icon.
///
/// On macOS/Windows, we cache icons in our data directory using the `icon()` function.
async fn get_app_icon_path<R: Runtime>(
    tauri_app_handle: &AppHandle<R>,
    app: &App,
) -> Result<PathBuf, String> {
    if cfg!(target_os = "linux") {
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

        icon(tauri_app_handle.clone(), app_path, Some(options))
            .await
            .map_err(|err| err.to_string())
    }
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

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppMetadata {
    name: String,
    r#where: PathBuf,
    size: u64,
    icon: PathBuf,
    created: u128,
    modified: u128,
    last_opened: u128,
}

/// List apps that are in the `search_path`.
///
/// Different from `list_app_in()`, every app is JSON object containing its metadata, e.g.:
///
/// ```json
/// {
///   "name": "Finder",
///   "where": "/System/Library/CoreServices",
///   "size": 49283072,
///   "icon": "/xxx.png",  
///   "created": 1744625204,
///   "modified": 1744625204,
///   "lastOpened": 1744625250
/// }
/// ```
#[tauri::command]
pub async fn list_app_with_metadata_in<R: Runtime>(
    app_handle: AppHandle<R>,
    search_path: Vec<String>,
) -> Result<Vec<AppMetadata>, String> {
    let apps = list_app_in(search_path)?;

    let mut apps_with_meta = Vec::with_capacity(apps.len());

    // name version where Type(hardcoded Application) Size Created Modify
    for app in apps.iter() {
        let app_path = get_app_path(app);
        let app_name = get_app_name(app).await;
        let app_path_where = {
            let mut app_path_clone = app_path.clone();
            let truncated = app_path_clone.pop();
            if !truncated {
                panic!("every app file should live somewhere");
            }

            app_path_clone
        };
        let icon = get_app_icon_path(&app_handle, app).await?;

        let raw_app_metadata = metadata(app_path.clone(), None).await?;

        let app_metadata = AppMetadata {
            name: app_name,
            r#where: app_path_where,
            size: raw_app_metadata.size,
            icon,
            created: raw_app_metadata.created_at,
            modified: raw_app_metadata.modified_at,
            last_opened: raw_app_metadata.accessed_at,
        };

        apps_with_meta.push(app_metadata);
    }

    Ok(apps_with_meta)
}

pub struct ApplicationSearchSource {
    base_score: f64,
    // app name -> app icon path
    icons: HashMap<String, PathBuf>,
    application_paths: Trie<PathBuf>,
}

impl ApplicationSearchSource {
    pub async fn new<R: Runtime>(
        app_handle: AppHandle<R>,
        base_score: f64,
    ) -> Result<Self, String> {
        let application_paths = Trie::new();
        let mut icons = HashMap::new();

        let default_search_path = get_default_search_paths();
        let apps = list_app_in(default_search_path)?;

        for app in &apps {
            let app_path = get_app_path(app);
            let app_name = get_app_name(app).await;
            let app_icon_path = get_app_icon_path(&app_handle, app).await?;

            if app_name.is_empty() || app_name.eq("Coco-AI") {
                continue;
            }

            application_paths.insert(&app_name, app_path);
            icons.insert(app_name, app_icon_path);
        }

        Ok(ApplicationSearchSource {
            base_score,
            icons,
            application_paths,
        })
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
            id: DATA_SOURCE_ID.into(),
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

        let mut total_hits = 0;
        let mut hits = Vec::new();

        let query_string_len = query_string.len();
        let mut results = self
            .application_paths
            .search_within_distance_scored(&query_string, query_string_len - 1);

        // Check for NaN or extreme score values and handle them properly
        results.sort_by(|a, b| {
            // If either score is NaN, consider them equal (you can customize this logic as needed)
            if a.score.is_nan() || b.score.is_nan() {
                std::cmp::Ordering::Equal
            } else {
                // Otherwise, compare the scores as usual
                b.score
                    .partial_cmp(&a.score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            }
        });

        if !results.is_empty() {
            for result in results {
                let app_name = result.word;
                let app_path = result.data.first().unwrap().clone();
                let app_path_string = app_path.to_string_lossy().into_owned();

                total_hits += 1;

                let mut doc = Document::new(
                  Some(DataSourceReference {
                      r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                      name: Some(DATA_SOURCE_ID.into()),
                      id: Some(DATA_SOURCE_ID.into()),
                      icon: None,
                  }),
                  app_path_string.clone(),
                  "Application".to_string(),
                  app_name.clone(),
                  app_path_string.clone(),
              );

                // Attach icon if available
                if let Some(icon_path) = self.icons.get(app_name.as_str()) {
                    doc.icon = Some(icon_path.as_os_str().to_str().unwrap().to_string());
                }

                hits.push((doc, self.base_score + result.score as f64));
            }
        }

        Ok(QueryResponse {
            source: self.get_type(),
            hits,
            total_hits,
        })
    }
}
