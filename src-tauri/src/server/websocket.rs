use crate::server::servers::{get_server_by_id, get_server_token};
use futures::StreamExt;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::net::TcpStream;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::handshake::client::generate_key;
use tokio_tungstenite::{Connector, connect_async_tls_with_config};
#[derive(Default)]
pub struct WebSocketManager {
    connections: Arc<Mutex<HashMap<String, Arc<WebSocketInstance>>>>,
}

struct WebSocketInstance {
    ws_connection: Mutex<WebSocketStream<MaybeTlsStream<TcpStream>>>, // No need to lock the entire map
    cancel_tx: mpsc::Sender<()>,
}

fn convert_to_websocket(endpoint: &str) -> Result<String, String> {
    let url = url::Url::parse(endpoint).map_err(|e| format!("Invalid URL: {}", e))?;
    let ws_protocol = if url.scheme() == "https" {
        "wss://"
    } else {
        "ws://"
    };
    let host = url.host_str().ok_or("No host found in URL")?;
    let port = url
        .port_or_known_default()
        .unwrap_or(if url.scheme() == "https" { 443 } else { 80 });

    let ws_endpoint = if port == 80 || port == 443 {
        format!("{}{}{}", ws_protocol, host, "/ws")
    } else {
        format!("{}{}:{}/ws", ws_protocol, host, port)
    };
    Ok(ws_endpoint)
}

#[tauri::command]
pub async fn connect_to_server<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    id: String,
    client_id: String,
    state: tauri::State<'_, WebSocketManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let connections_clone = state.connections.clone();

    // Disconnect old connection first
    disconnect(client_id.clone(), state.clone()).await.ok();

    let server = get_server_by_id(&id)
        .await
        .ok_or(format!("Server with ID {} not found", id))?;
    let endpoint = convert_to_websocket(&server.endpoint)?;
    let token = get_server_token(&id).await.map(|t| t.access_token.clone());

    let mut request =
        tokio_tungstenite::tungstenite::client::IntoClientRequest::into_client_request(&endpoint)
            .map_err(|e| format!("Failed to create WebSocket request: {}", e))?;

    request
        .headers_mut()
        .insert("Connection", "Upgrade".parse().unwrap());
    request
        .headers_mut()
        .insert("Upgrade", "websocket".parse().unwrap());
    request
        .headers_mut()
        .insert("Sec-WebSocket-Version", "13".parse().unwrap());
    request
        .headers_mut()
        .insert("Sec-WebSocket-Key", generate_key().parse().unwrap());

    if let Some(token) = token {
        request
            .headers_mut()
            .insert("X-API-TOKEN", token.parse().unwrap());
    }

    let allow_self_signature =
        crate::settings::get_allow_self_signature(tauri_app_handle.clone()).await;
    let tls_connector = tokio_native_tls::native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(allow_self_signature)
        .build()
        .map_err(|e| format!("TLS build error: {:?}", e))?;

    let connector = Connector::NativeTls(tls_connector.into());

    let (ws_stream, _) = connect_async_tls_with_config(
        request,
        None,            // WebSocketConfig
        true,            // disable_nagle
        Some(connector), // Connector
    )
    .await
    .map_err(|e| format!("WebSocket TLS error: {:?}", e))?;

    let (cancel_tx, mut cancel_rx) = mpsc::channel(1);

    let instance = Arc::new(WebSocketInstance {
        ws_connection: Mutex::new(ws_stream),
        cancel_tx,
    });

    // Insert connection into the map (lock is held briefly)
    {
        let mut connections = connections_clone.lock().await;
        connections.insert(client_id.clone(), instance.clone());
    }

    // Spawn WebSocket handler in a separate task
    let app_handle_clone = app_handle.clone();
    let client_id_clone = client_id.clone();
    tokio::spawn(async move {
        let ws = &mut *instance.ws_connection.lock().await;

        loop {
            tokio::select! {
                msg = ws.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            let _ = app_handle_clone.emit(&format!("ws-message-{}", client_id_clone), text);
                        },
                        Some(Err(_)) | None => {
                            log::debug!("WebSocket connection closed or error");
                            let _ = app_handle_clone.emit(&format!("ws-error-{}", client_id_clone), id.clone());
                            break;
                        }
                        _ => {}
                    }
                }
                _ = cancel_rx.recv() => {
                    log::debug!("WebSocket connection cancelled");
                    let _ = app_handle_clone.emit(&format!("ws-cancel-{}", client_id_clone), id.clone());
                    break;
                }
            }
        }

        // Remove connection after it closes
        let mut connections = connections_clone.lock().await;
        connections.remove(&client_id_clone);
    });

    Ok(())
}

#[tauri::command]
pub async fn disconnect(
    client_id: String,
    state: tauri::State<'_, WebSocketManager>,
) -> Result<(), String> {
    let instance = {
        let mut connections = state.connections.lock().await;
        connections.remove(&client_id)
    };

    if let Some(instance) = instance {
        let _ = instance.cancel_tx.send(()).await;

        // Close WebSocket (lock only the connection, not the whole map)
        let mut ws = instance.ws_connection.lock().await;
        let _ = ws.close(None).await;
    }

    Ok(())
}
