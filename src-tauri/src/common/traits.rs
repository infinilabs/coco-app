use crate::common::error::SearchError;
// use std::{future::Future, pin::Pin};
use crate::common::search::SearchQuery;
use crate::common::search::{QueryResponse, QuerySource};
use async_trait::async_trait;

#[async_trait]
pub trait SearchSource: Send + Sync {
    fn get_type(&self) -> QuerySource;

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError>;
}

