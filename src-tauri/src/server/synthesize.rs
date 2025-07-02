use crate::server::http_client::HttpClient;
use futures_util::StreamExt;
use http::Method;
use serde_json::json;
use tauri::{command, AppHandle, Emitter, Runtime};

#[command]
pub async fn synthesize<R: Runtime>(
    app_handle: AppHandle<R>,
    client_id: String,
    server_id: String,
    voice: String,
    content: String,
) -> Result<(), String> {
    println!("client_id: {:?}", &client_id);
    println!("server_id: {:?}", &server_id);
    println!("voice: {:?}", &voice);
    println!("content: {:?}", &content);

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

    if response.status() == 429 {
        return Ok(());
    }

    if !response.status().is_success() {
        return Err(format!("Request Failed: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                log::info!("Received audio chunk of size: {}", bytes.len());
                // Encode audio chunk to base64 for frontend compatibility
                let encoded = base64::encode(&bytes);
                if let Err(err) = app_handle.emit(&client_id, encoded) {
                    eprintln!("Emit error: {:?}", err);
                }
            }
            Err(e) => {
                eprintln!("Stream error: {:?}", e);
                break;
            }
        }
    }

    Ok(())
}
