use crate::common::http::get_response_body_text;
use crate::server::http_client::HttpClient;
use serde::{Deserialize, Serialize};
use serde_json::{from_str, Value};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    task_id: String,
    results: Vec<Value>,
}

#[command]
pub async fn transcription(
    server_id: String,
    audio_content: String,
) -> Result<TranscriptionResponse, String> {
    // Send request to initiate transcription task
    let init_response = HttpClient::post(
        &server_id,
        "/services/audio/transcription",
        None,
        Some(audio_content.into()),
    )
    .await
    .map_err(|e| format!("Failed to initiate transcription: {}", e))?;

    // Extract response body as text
    let init_response_text = get_response_body_text(init_response)
        .await
        .map_err(|e| format!("Failed to read initial response body: {}", e))?;

    // Parse response JSON to extract task ID
    let init_response_json: Value = from_str(&init_response_text).map_err(|e| {
        format!(
            "Failed to parse initial response JSON: {}. Raw response: {}",
            e, init_response_text
        )
    })?;

    let transcription_task_id = init_response_json["task_id"]
        .as_str()
        .ok_or_else(|| {
            format!(
                "Missing or invalid task_id in initial response: {}",
                init_response_text
            )
        })?
        .to_string();

    // Set up polling with timeout
    let polling_start = std::time::Instant::now();
    const POLLING_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);
    const POLLING_INTERVAL: std::time::Duration = std::time::Duration::from_millis(200);

    let mut transcription_response: TranscriptionResponse;

    loop {
        // Poll for transcription results
        let poll_response = HttpClient::get(
            &server_id,
            &format!("/services/audio/task/{}", transcription_task_id),
            None,
        )
        .await
        .map_err(|e| format!("Failed to poll transcription task: {}", e))?;

        // Extract poll response body
        let poll_response_text = get_response_body_text(poll_response)
            .await
            .map_err(|e| format!("Failed to read poll response body: {}", e))?;

        // Parse poll response JSON
        transcription_response = from_str(&poll_response_text).map_err(|e| {
            format!(
                "Failed to parse poll response JSON: {}. Raw response: {}",
                e, poll_response_text
            )
        })?;

        // Check if transcription results are available
        if !transcription_response.results.is_empty() {
            break;
        }

        // Check for timeout
        if polling_start.elapsed() >= POLLING_TIMEOUT {
            return Err("Transcription task timed out after 30 seconds".to_string());
        }

        // Wait before next poll
        tokio::time::sleep(POLLING_INTERVAL).await;
    }

    Ok(transcription_response)
}
