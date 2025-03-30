use crate::server::servers::{get_server_by_id, get_server_token};
use futures_util::StreamExt;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{
    connect_async, tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream,
};
use tungstenite::handshake::client::generate_key;

#[derive(Default)]
pub struct WebSocketManager {
    connections: Arc<Mutex<HashMap<String, WebSocketInstance>>>,
}

struct WebSocketInstance {
    ws_connection: WebSocketStream<MaybeTlsStream<TcpStream>>,
    cancel_tx: mpsc::Sender<()>,
}

// Convert HTTP endpoint to WebSocket endpoint
fn convert_to_websocket(endpoint: &str) -> Result<String, String> {
    let url = url::Url::parse(endpoint).map_err(|e| format!("Invalid URL: {}", e))?;
    let ws_protocol = if url.scheme() == "https" { "wss://" } else { "ws://" };
    let host = url.host_str().ok_or("No host found in URL")?;
    let port = url.port_or_known_default().unwrap_or(if url.scheme() == "https" { 443 } else { 80 });

    let ws_endpoint = if port == 80 || port == 443 {
        format!("{}{}{}", ws_protocol, host, "/ws")
    } else {
        format!("{}{}:{}/ws", ws_protocol, host, port)
    };
    Ok(ws_endpoint)
}

#[tauri::command]
pub async fn connect_to_server(
    id: String,
    client_id: String,
    state: tauri::State<'_, WebSocketManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;

    // Disconnect existing instance for the client_id if it exists
    if connections.contains_key(&client_id) {
        disconnect(client_id.clone(), state.clone()).await?;
    }

    // Retrieve server details
    let server = get_server_by_id(&id).ok_or(format!("Server with ID {} not found", id))?;
    let endpoint = convert_to_websocket(&server.endpoint)?;

    // Retrieve optional token
    let token = get_server_token(&id).await?.map(|t| t.access_token.clone());

    // Create WebSocket request
    let mut request =
        tokio_tungstenite::tungstenite::client::IntoClientRequest::into_client_request(&endpoint)
            .map_err(|e| format!("Failed to create WebSocket request: {}", e))?;

    request.headers_mut().insert("Connection", "Upgrade".parse().unwrap());
    request.headers_mut().insert("Upgrade", "websocket".parse().unwrap());
    request.headers_mut().insert("Sec-WebSocket-Version", "13".parse().unwrap());
    request.headers_mut().insert("Sec-WebSocket-Key", generate_key().parse().unwrap());

    if let Some(token) = token {
        request.headers_mut().insert("X-API-TOKEN", token.parse().unwrap());
    }

    let (ws_stream, _) = connect_async(request).await.map_err(|e| format!("WebSocket error: {:?}", e))?;

    // Create cancellation channel
    let (cancel_tx, mut cancel_rx) = mpsc::channel(1);

    // Store new connection
    connections.insert(client_id.clone(), WebSocketInstance { ws_connection: ws_stream, cancel_tx });

    // Spawn task for receiving messages
    let app_handle_clone = app_handle.clone();
    let connections_clone = state.connections.clone();
    tokio::spawn(async move {
        let mut connections = connections_clone.lock().await;
        if let Some(instance) = connections.get_mut(&client_id) {
            let ws = &mut instance.ws_connection;
            loop {
                tokio::select! {
                    msg = ws.next() => {
                        match msg {
                            Some(Ok(Message::Text(text))) => {
                                println!("client_id: {}, text: {}", client_id, text);
                                let _ = app_handle_clone.emit(&format!("ws-message-{}", client_id), text);
                            },
                            Some(Err(_)) | None => {
                                let _ = app_handle_clone.emit(&format!("ws-error-{}", client_id), id.clone());
                                break;
                            }
                        _ => {}}
                    }
                    _ = cancel_rx.recv() => {
                        let _ = app_handle_clone.emit(&format!("ws-error-{}", client_id), id.clone());
                        break;
                    }
                }
            }
            connections.remove(&client_id);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn disconnect(client_id: String, state: tauri::State<'_, WebSocketManager>) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    if let Some(mut instance) = connections.remove(&client_id) {
        let _ = instance.cancel_tx.send(()).await;
        let _ = instance.ws_connection.close(None).await;
    }
    Ok(())
}