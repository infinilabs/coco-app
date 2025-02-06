use crate::common::search::QueryResponse;
use thiserror::Error;

use async_trait::async_trait;
use std::{future::Future, pin::Pin};
use crate::common::search::SearchQuery;

#[async_trait]
pub trait SearchSource: Send + Sync {
    fn search(
        &self,
        query: SearchQuery,
    ) -> Pin<Box<dyn Future<Output=Result<QueryResponse, SearchError>> + Send>>;
}


#[derive(Debug, Error)]
pub enum SearchError {
    #[error("HTTP request failed: {0}")]
    HttpError(String),

    #[error("Invalid response format: {0}")]
    ParseError(String),

    #[error("Timeout occurred")]
    Timeout,

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<reqwest::Error> for SearchError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            SearchError::Timeout
        } else if err.is_decode() {
            SearchError::ParseError(err.to_string())
        } else {
            SearchError::HttpError(err.to_string())
        }
    }
}