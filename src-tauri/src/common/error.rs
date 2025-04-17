use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Deserialize)]
pub struct ErrorDetail {
    pub reason: String,
    pub status: u16,
}

#[derive(Debug, Deserialize)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
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