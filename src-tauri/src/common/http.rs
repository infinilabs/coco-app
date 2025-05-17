use crate::common;
use reqwest::Response;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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

pub async fn get_response_body_text(response: Response) -> Result<String, String> {
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}, code: {}", e, status))?;

    //log::debug!("Response status: {}, body: {}", status, &body);

    if status < 200 || status >= 400 {
        // Try to parse the error body
        let fallback_error = "Failed to send message".to_string();

        if body.trim().is_empty() {
            return Err(fallback_error);
        }

        match serde_json::from_str::<common::error::ErrorResponse>(&body) {
            Ok(parsed_error) => {
                dbg!(&parsed_error);
                Err(format!(
                    "Server error ({}): {}",
                    parsed_error.error.status, parsed_error.error.reason
                ))
            }
            Err(_) => Err(fallback_error),
        }
    } else {
        Ok(body)
    }
}
