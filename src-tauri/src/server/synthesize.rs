use crate::server::http_client::HttpClient;
use futures::TryStreamExt;
use http::Method;
use serde_json::json;
use tauri::{command, AppHandle, Emitter, Runtime};
use tokio::io::AsyncBufReadExt;

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

    if response.status() == 429 {
        return Ok(());
    }

    if !response.status().is_success() {
        return Err(format!("Request Failed: {}", response.status()));
    }

    let stream = response.bytes_stream();
    let reader = tokio_util::io::StreamReader::new(
        stream.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
    );
    let mut lines = tokio::io::BufReader::new(reader).lines();

    while let Ok(Some(line)) = lines.next_line().await {
        dbg!("Received line: {}", &line);

        let _ = app_handle.emit(&client_id, line).map_err(|err| {
            println!("Failed to emit: {:?}", err);
        });
    }

    Ok(())
}
