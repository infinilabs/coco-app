use crate::common::assistant::ChatRequestMessage;
use crate::common::http::GetResponse;
use crate::server::http_client::HttpClient;
use reqwest::Response;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub async fn new_chat<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    message: String,
) -> Result<GetResponse, String> {
    let body = if !message.is_empty() {
        let message = ChatRequestMessage {
            message: Some(message),
        };
        let body = reqwest::Body::from(serde_json::to_string(&message).unwrap());
        Some(body)
    } else {
        None
    };

    let query_params: Option<HashMap<String, String>> = None;

    let response = HttpClient::post(&server_id, "/chat/_new", query_params, body)
        .await
        .map_err(|e| format!("Error sending message: {}", e))?;

    if response.status().as_u16() < 200 || response.status().as_u16() >= 400 {
        return Err("Failed to send message".to_string());
    }

    let chat_response: GetResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    // Check the result and status fields
    if chat_response.result != "created" {
        return Err(format!("Unexpected result: {}", chat_response.result));
    }

    Ok(chat_response)
}

#[tauri::command]
pub async fn chat_history<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    from: u32,
    size: u32,
) -> Result<String, String> {
    let mut query_params = HashMap::new();
    if from > 0 {
        query_params.insert("from".to_string(), from.to_string());
    }
    if size > 0 {
        query_params.insert("size".to_string(), size.to_string());
    }

    let response = HttpClient::get(&server_id, "/chat/_history", Some(query_params))
        .await
        .map_err(|e| format!("Error get sessions: {}", e))?;

    handle_raw_response(response).await?
}

async fn handle_raw_response(response: Response) -> Result<Result<String, String>, String> {
    Ok(
        if response.status().as_u16() < 200 || response.status().as_u16() >= 400 {
            Err("Failed to send message".to_string())
        } else {
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to parse response JSON: {}", e))?;
            Ok(body)
        },
    )
}

#[tauri::command]
pub async fn session_chat_history<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
    from: u32,
    size: u32,
) -> Result<String, String> {
    let mut query_params = HashMap::new();
    if from > 0 {
        query_params.insert("from".to_string(), from.to_string());
    }
    if size > 0 {
        query_params.insert("size".to_string(), size.to_string());
    }

    let path = format!("/chat/{}/_history", session_id);

    let response = HttpClient::get(&server_id, path.as_str(), Some(query_params))
        .await
        .map_err(|e| format!("Error get session message: {}", e))?;

    handle_raw_response(response).await?
}

#[tauri::command]
pub async fn open_session_chat<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let mut query_params = HashMap::new();
    let path = format!("/chat/{}/_open", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), Some(query_params), None)
        .await
        .map_err(|e| format!("Error open session: {}", e))?;

    handle_raw_response(response).await?
}

#[tauri::command]
pub async fn close_session_chat<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let mut query_params = HashMap::new();
    let path = format!("/chat/{}/_close", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), Some(query_params), None)
        .await
        .map_err(|e| format!("Error close session: {}", e))?;

    handle_raw_response(response).await?
}
#[tauri::command]
pub async fn cancel_session_chat<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let mut query_params = HashMap::new();
    let path = format!("/chat/{}/_cancel", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), Some(query_params), None)
        .await
        .map_err(|e| format!("Error cancel session: {}", e))?;

    handle_raw_response(response).await?
}

#[tauri::command]
pub async fn send_message<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
    message: String,
    query_params: Option<HashMap<String, String>>, //search,deep_thinking
    datasource: String,
) -> Result<String, String> {
    println!("datasource: {}", datasource);
    let path = format!("/chat/{}/_send", session_id);
    let msg = ChatRequestMessage {
        message: Some(message),
    };

    let body = reqwest::Body::from(serde_json::to_string(&msg).unwrap());
    let response =
        HttpClient::advanced_post(&server_id, path.as_str(), None, query_params, Some(body))
            .await
            .map_err(|e| format!("Error cancel session: {}", e))?;

    handle_raw_response(response).await?
}
