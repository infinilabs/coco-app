use super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::document::DataSourceReference;
use crate::common::document::Document;
use crate::common::error::SearchError;
use crate::common::search::QueryResponse;
use crate::common::search::QuerySource;
use crate::common::search::SearchQuery;
use crate::common::traits::SearchSource;
use async_trait::async_trait;
use tauri::AppHandle;

const DATA_SOURCE_ID: &str = "View Mode Extensions";

pub(crate) struct ViewModeExtensions;

#[async_trait]
impl SearchSource for ViewModeExtensions {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or(DATA_SOURCE_ID.into())
                .to_string_lossy()
                .into(),
            id: DATA_SOURCE_ID.into(),
        }
    }

    async fn search(
        &self,
        _tauri_app_handle: AppHandle,
        _query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        const SCORE: f64 = 2000.0;

        let doc = Document {
            id: "list_desktop".into(),
            category: Some(DATA_SOURCE_ID.to_string()),
            title: Some("List ~/Desktop".into()),
            icon: None,
            source: Some(DataSourceReference {
                r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                name: Some(DATA_SOURCE_ID.into()),
                id: Some(DATA_SOURCE_ID.into()),
                icon: Some("font_Store".to_string()),
            }),
            ..Default::default()
        };

        Ok(QueryResponse {
            source: self.get_type(),
            hits: vec![(doc, SCORE)],
            total_hits: 1,
        })
    }
}
