pub(crate) mod config;
pub(crate) mod implementation;

use super::super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::{
    error::SearchError,
    search::{QueryResponse, QuerySource, SearchQuery},
    traits::SearchSource,
};
use async_trait::async_trait;
use config::FileSearchConfig;
use hostname;
use tauri::AppHandle;

pub(crate) const EXTENSION_ID: &str = "File Search";

/// JSON file for this extension.
pub(crate) const PLUGIN_JSON_FILE: &str = r#"
{
  "id": "File Search",
  "name": "File Search",
  "platforms": ["macos", "windows"],
  "description": "Search files on your system",
  "icon": "font_Filesearch",
  "type": "extension"
}
"#;

pub struct FileSearchExtensionSearchSource;

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

    async fn search(
        &self,
        tauri_app_handle: AppHandle,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        let Some(query_string) = query.query_strings.get("query") else {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        };
        let from = usize::try_from(query.from).expect("from too big");
        let size = usize::try_from(query.size).expect("size too big");

        let query_string = query_string.trim();
        if query_string.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        }

        // Get configuration from tauri store
        let config = FileSearchConfig::get(&tauri_app_handle);

        // If search paths are empty, then the hit should be empty.
        //
        // Without this, empty search paths will result in a mdfind that has no `-onlyin`
        // option, which will in turn query the whole disk volume.
        if config.search_paths.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        }

        // Execute search in a blocking task
        let query_source = self.get_type();

        let hits = implementation::hits(&query_string, from, size, &config)
            .await
            .map_err(SearchError::InternalError)?;

        let total_hits = hits.len();
        Ok(QueryResponse {
            source: query_source,
            hits,
            total_hits,
        })
    }
}
