use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Deserialize)]
pub struct ErrorCause {
    #[serde(default)]
    pub r#type: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ErrorDetail {
    #[serde(default)]
    pub root_cause: Option<Vec<ErrorCause>>,
    #[serde(default)]
    pub r#type: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub caused_by: Option<ErrorCause>,
}

#[derive(Debug, Deserialize)]
pub struct ErrorResponse {
    #[serde(default)]
    pub error: Option<ErrorDetail>,
    #[serde(default)]
    pub status: Option<u16>,
}

#[derive(Debug, Error, Serialize)]
pub enum SearchError {
    #[error("HttpError: {0}")]
    HttpError(String),

    #[error("ParseError: {0}")]
    ParseError(String),

    #[error("Timeout occurred")]
    Timeout,

    #[error("UnknownError: {0}")]
    #[allow(dead_code)]
    Unknown(String),

    #[error("InternalError: {0}")]
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