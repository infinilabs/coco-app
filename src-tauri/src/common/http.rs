use crate::common;
use reqwest::Response;
use std::collections::HashMap;
use tauri_plugin_store::JsonValue;

pub async fn get_response_body_text(response: Response) -> Result<String, String> {
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}, code: {}", e, status))?;

    log::debug!("Response status: {}, body: {}", status, &body);

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
                    "Server error ({}): {:?}",
                    status, parsed_error.error
                ))
            }
            Err(_) => {
                log::warn!("Failed to parse error response: {}", &body);
                Err(fallback_error)
            }
        }
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
