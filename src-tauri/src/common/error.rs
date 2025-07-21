use reqwest::StatusCode;
use serde::{Deserialize, Serialize, Serializer};
use thiserror::Error;

fn serialize_optional_status_code<S>(
    status_code: &Option<StatusCode>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match status_code {
        Some(code) => serializer.serialize_str(&format!("{:?}", code)),
        None => serializer.serialize_none(),
    }
}

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
    #[error("HttpError: status code [{status_code:?}], msg [{msg}]")]
    HttpError {
        #[serde(serialize_with = "serialize_optional_status_code")]
        status_code: Option<StatusCode>,
        msg: String,
    },

    #[error("ParseError: {0}")]
    ParseError(String),

    #[error("Timeout occurred")]
    Timeout,

    #[error("UnknownError: {0}")]
    Unknown(String),

    #[error("InternalError: {0}")]
    InternalError(String),
}

impl From<reqwest::Error> for SearchError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            SearchError::Timeout
        } else if err.is_decode() {
            SearchError::ParseError(err.to_string())
        } else {
            SearchError::HttpError {
                status_code: err.status(),
                msg: err.to_string(),
            }
        }
    }
}
