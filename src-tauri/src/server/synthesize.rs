use crate::server::http_client::{HttpClient, HttpRequestError};
use futures_util::StreamExt;
use http::Method;
use serde_json::json;
use tauri::{AppHandle, Emitter, command};

#[command]
pub async fn synthesize(
    app_handle: AppHandle,
    client_id: String,
    server_id: String,
    voice: String,
    content: String,
) -> Result<(), HttpRequestError> {
    let body = json!({
        "voice": voice,
        "content": content,
    })
    .to_string();

    let response = HttpClient::send_request(
        server_id.as_str(),
        Method::POST,
        "/services/audio/synthesize",
        None,
        None,
        Some(reqwest::Body::from(body.to_string())),
    )
    .await?;

    log::info!("Synthesize response status: {}", response.status());

    let status_code = response.status();

    if status_code == 429 {
        return Ok(());
    }

    if !status_code.is_success() {
        return Err(HttpRequestError::RequestFailed {
            status: status_code.as_u16(),
            error_response_body_str: None,
            coco_server_api_error_response_body: None,
        });
    }

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                if let Err(err) = app_handle.emit(&client_id, bytes.to_vec()) {
                    log::error!("Emit error: {:?}", err);
                }
            }
            Err(e) => {
                log::error!("Stream error: {:?}", e);
                break;
            }
        }
    }

    Ok(())
}
