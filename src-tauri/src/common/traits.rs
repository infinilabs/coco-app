use crate::common::search::{QueryResponse, QuerySource};
use thiserror::Error;

use async_trait::async_trait;
// use std::{future::Future, pin::Pin};
use crate::common::search::SearchQuery;
use serde::Serialize;

#[async_trait]
pub trait SearchSource: Send + Sync {
    fn get_type(&self) -> QuerySource;

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError>;
}

#[derive(Debug, Error, Serialize)]
pub enum SearchError {
    #[error("HTTP request failed: {0}")]
    HttpError(String),

    #[error("Invalid response format: {0}")]
    ParseError(String),

    #[error("Timeout occurred")]
    Timeout,

    #[error("Unknown error: {0}")]
    #[allow(dead_code)]
    Unknown(String),

    #[error("InternalError error: {0}")]
    #[allow(dead_code)]
    InternalError(String),
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
