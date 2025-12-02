use crate::{
    common,
    server::http_client::{DecodeResponseSnafu, HttpRequestError},
};
use reqwest::Response;
use std::collections::HashMap;
use tauri_plugin_store::JsonValue;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use snafu::ResultExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct GetResponse {
    pub _id: String,
    pub _source: Source,
    pub result: String,
    pub payload: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Source {
    pub id: String,
    pub created: String,
    pub updated: String,
    pub status: String,
}

pub async fn get_response_body_text(response: Response) -> Result<String, HttpRequestError> {
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .context(DecodeResponseSnafu)?
        .trim()
        .to_string();

    log::debug!("Response status: {}, body: {}", status, &body);

    if status < 200 || status >= 400 {
        if body.is_empty() {
            return Err(HttpRequestError::RequestFailed {
                status,
                error_response_body_str: None,
                coco_server_api_error_response_body: None,
            });
        }

        // Ignore this error, including a `serde_json::Error` in `HttpRequestError::RequestFailed`
        // would be too verbose. And it is still easy to debug without this error, since we have
        // the raw error response body.
        let api_error = serde_json::from_str::<common::error::ApiError>(&body).ok();
        Err(HttpRequestError::RequestFailed {
            status,
            error_response_body_str: Some(body),
            coco_server_api_error_response_body: api_error,
        })
    } else {
        Ok(body)
    }
}

pub fn convert_query_params_to_strings(
    query_params: Option<HashMap<String, JsonValue>>,
) -> Option<Vec<String>> {
    query_params.map(|map| {
        map.into_iter()
            .filter_map(|(k, v)| match v {
                JsonValue::String(s) => Some(format!("{}={}", k, s)),
                JsonValue::Number(n) => Some(format!("{}={}", k, n)),
                JsonValue::Bool(b) => Some(format!("{}={}", k, b)),
                _ => {
                    eprintln!("Skipping unsupported query value for key '{}': {:?}", k, v);
                    None
                }
            })
            .collect()
    })
}
