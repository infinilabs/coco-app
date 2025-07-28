use crate::common::error::SearchError;
use crate::common::search::SearchQuery;
use crate::common::search::{QueryResponse, QuerySource};
use async_trait::async_trait;
use tauri::AppHandle;

#[async_trait]
pub trait SearchSource: Send + Sync {
    fn get_type(&self) -> QuerySource;

    async fn search(
        &self,
        tauri_app_handle: AppHandle,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError>;
}
