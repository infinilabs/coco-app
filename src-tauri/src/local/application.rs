use crate::common::document::{DataSourceReference, Document};
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::{SearchError, SearchSource};
use crate::local::LOCAL_QUERY_SOURCE_TYPE;
use applications::{AppInfo, AppInfoContext};
use async_trait::async_trait;
use base64::encode;
use fuzzy_prefix_search::Trie;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};
use tauri_plugin_fs_pro::{icon, name};

pub struct ApplicationSearchSource {
    base_score: f64,
    icons: HashMap<String, PathBuf>,
    application_paths: Trie<String>,
}

impl ApplicationSearchSource {
    pub async fn new<R: Runtime>(
        app_handle: AppHandle<R>,
        base_score: f64,
    ) -> Result<Self, String> {
        let application_paths = Trie::new();
        let mut icons = HashMap::new();

        let mut ctx = AppInfoContext::new(vec![]);
        ctx.refresh_apps().map_err(|err| err.to_string())?; // must refresh apps before getting them
        let apps = ctx.get_all_apps();

        for app in &apps {
            let path = if cfg!(target_os = "macos") {
                app.app_desktop_path.clone()
            } else {
                app.app_path_exe
                    .clone()
                    .unwrap_or(PathBuf::from("Path not found"))
            };
            let search_word = name(path.clone()).await;
            let icon = icon(app_handle.clone(), path.clone(), Some(256))
                .await
                .map_err(|err| err.to_string())?;
            let path_string = path.to_string_lossy().into_owned();

            if search_word.is_empty() || search_word.eq("coco-ai") {
                continue;
            }

            application_paths.insert(&search_word, path_string.clone());
            icons.insert(path_string, icon);
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

        let mut total_hits = 0;
        let mut hits = Vec::new();

        let mut results = self
            .application_paths
            .search_within_distance_scored(&query_string, 3);

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
                let file_name_str = result.word;
                let file_path_str = result.data.get(0).unwrap().to_string();
                let file_path = PathBuf::from(file_path_str.clone());
                let cleaned_file_name = name(file_path).await;
                total_hits += 1;
                let mut doc = Document::new(
                    Some(DataSourceReference {
                        r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                        name: Some("Applications".into()),
                        id: Some(file_name_str.clone()),
                    }),
                    file_path_str.clone(),
                    "Application".to_string(),
                    cleaned_file_name,
                    file_path_str.clone(),
                );

                // Attach icon if available
                if let Some(icon_path) = self.icons.get(file_path_str.as_str()) {
                    // doc.icon = Some(format!("file://{}", icon_path.to_string_lossy()));
                    // dbg!(&doc.icon);
                    if let Ok(icon_data) = read_icon_and_encode(icon_path) {
                        doc.icon = Some(format!("data:image/png;base64,{}", icon_data));
                    }
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

// Function to read the icon file and convert it to base64
fn read_icon_and_encode(icon_path: &Path) -> Result<String, std::io::Error> {
    // Read the icon file as binary data
    let icon_data = fs::read(icon_path)?;

    // Encode the data to base64
    Ok(encode(&icon_data))
}
