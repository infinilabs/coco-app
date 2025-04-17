use crate::common::http::get_response_body_text;
use crate::server::http_client::HttpClient;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub text: String,
}

#[command]
pub async fn transcription(
    server_id: String,
    audio_type: String,
    audio_content: String,
) -> Result<TranscriptionResponse, String> {
    let mut query_params = HashMap::new();
    query_params.insert("type".to_string(), JsonValue::String(audio_type));
    query_params.insert("content".to_string(), JsonValue::String(audio_content));

    // Send the HTTP POST request
    let response = HttpClient::post(
        &server_id,
        "/services/audio/transcription",
        Some(query_params),
        None,
    )
        .await
        .map_err(|e| format!("Error sending transcription request: {}", e))?;

    // Use get_response_body_text to extract the response body as text
    let response_body = get_response_body_text(response)
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // Deserialize the response body into TranscriptionResponse
    let transcription_response: TranscriptionResponse = serde_json::from_str(&response_body)
        .map_err(|e| format!("Failed to parse transcription response: {}", e))?;

    Ok(transcription_response)
}
