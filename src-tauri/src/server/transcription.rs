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

    let response = HttpClient::post(
        &server_id,
        "/services/audio/transcription",
        Some(query_params),
        None,
    )
    .await?;

    if response.status().is_success() {
        response
            .json::<TranscriptionResponse>()
            .await
            .map_err(|e| e.to_string())
    } else {
        Err(format!(
            "Transcription failed with status: {}",
            response.status()
        ))
    }
}
