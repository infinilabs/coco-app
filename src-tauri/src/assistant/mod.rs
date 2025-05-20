use crate::common;
use crate::common::assistant::ChatRequestMessage;
use crate::common::http::GetResponse;
use crate::server::http_client::HttpClient;
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub async fn chat_history<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    from: u32,
    size: u32,
    query: Option<String>,
) -> Result<String, String> {
    let mut query_params: HashMap<String, Value> = HashMap::new();
    if from > 0 {
        query_params.insert("from".to_string(), from.into());
    }
    if size > 0 {
        query_params.insert("size".to_string(), size.into());
    }

    if let Some(query) = query {
        if !query.is_empty() {
            query_params.insert("query".to_string(), query.into());
        }
    }

    let response = HttpClient::get(&server_id, "/chat/_history", Some(query_params))
        .await
        .map_err(|e| {
            dbg!("Error get history: {}", &e);
            format!("Error get history: {}", e)
        })?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn session_chat_history<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
    from: u32,
    size: u32,
) -> Result<String, String> {
    let mut query_params: HashMap<String, Value> = HashMap::new();
    if from > 0 {
        query_params.insert("from".to_string(), from.into());
    }
    if size > 0 {
        query_params.insert("size".to_string(), size.into());
    }

    let path = format!("/chat/{}/_history", session_id);

    let response = HttpClient::get(&server_id, path.as_str(), Some(query_params))
        .await
        .map_err(|e| format!("Error get session message: {}", e))?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn open_session_chat<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let query_params = HashMap::new();
    let path = format!("/chat/{}/_open", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), Some(query_params), None)
        .await
        .map_err(|e| format!("Error open session: {}", e))?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn close_session_chat<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let query_params = HashMap::new();
    let path = format!("/chat/{}/_close", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), Some(query_params), None)
        .await
        .map_err(|e| format!("Error close session: {}", e))?;

    common::http::get_response_body_text(response).await
}
#[tauri::command]
pub async fn cancel_session_chat<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let query_params = HashMap::new();
    let path = format!("/chat/{}/_cancel", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), Some(query_params), None)
        .await
        .map_err(|e| format!("Error cancel session: {}", e))?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn new_chat<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    websocket_id: String,
    message: String,
    query_params: Option<HashMap<String, Value>>,
) -> Result<GetResponse, String> {
    let body = if !message.is_empty() {
        let message = ChatRequestMessage {
            message: Some(message),
        };
        Some(
            serde_json::to_string(&message)
                .map_err(|e| format!("Failed to serialize message: {}", e))?
                .into(),
        )
    } else {
        None
    };

    let mut headers = HashMap::new();
    headers.insert("WEBSOCKET-SESSION-ID".to_string(), websocket_id.into());

    let response =
        HttpClient::advanced_post(&server_id, "/chat/_new", Some(headers), query_params, body)
            .await
            .map_err(|e| format!("Error sending message: {}", e))?;

    let body_text = common::http::get_response_body_text(response).await?;

    log::debug!("New chat response: {}", &body_text);

    let chat_response: GetResponse =
        serde_json::from_str(&body_text).map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    if chat_response.result != "created" {
        return Err(format!("Unexpected result: {}", chat_response.result));
    }

    Ok(chat_response)
}

#[tauri::command]
pub async fn send_message<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    websocket_id: String,
    session_id: String,
    message: String,
    query_params: Option<HashMap<String, Value>>, //search,deep_thinking
) -> Result<String, String> {
    let path = format!("/chat/{}/_send", session_id);
    let msg = ChatRequestMessage {
        message: Some(message),
    };

    let mut headers = HashMap::new();
    headers.insert("WEBSOCKET-SESSION-ID".to_string(), websocket_id.into());

    let body = reqwest::Body::from(serde_json::to_string(&msg).unwrap());
    let response = HttpClient::advanced_post(
        &server_id,
        path.as_str(),
        Some(headers),
        query_params,
        Some(body),
    )
        .await
        .map_err(|e| format!("Error cancel session: {}", e))?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn delete_session_chat(server_id: String, session_id: String) -> Result<bool, String> {
    let response =
        HttpClient::delete(&server_id, &format!("/chat/{}", session_id), None, None).await?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Delete failed with status: {}", response.status()))
    }
}

#[tauri::command]
pub async fn update_session_chat(
    server_id: String,
    session_id: String,
    title: Option<String>,
    context: Option<HashMap<String, Value>>,
) -> Result<bool, String> {
    let mut body = HashMap::new();
    if let Some(title) = title {
        body.insert("title".to_string(), Value::String(title));
    }
    if let Some(context) = context {
        body.insert(
            "context".to_string(),
            Value::Object(context.into_iter().collect()),
        );
    }

    let response = HttpClient::put(
        &server_id,
        &format!("/chat/{}", session_id),
        None,
        None,
        Some(reqwest::Body::from(serde_json::to_string(&body).unwrap())),
    )
        .await
        .map_err(|e| format!("Error updating session: {}", e))?;

    Ok(response.status().is_success())
}

#[tauri::command]
pub async fn assistant_search<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
    from: u32,
    size: u32,
    query: Option<HashMap<String, Value>>,
) -> Result<Value, String> {
    let mut body = serde_json::json!({
        "from": from,
        "size": size,
    });

    if let Some(q) = query {
        body["query"] = serde_json::to_value(q).map_err(|e| e.to_string())?;
    }

    let response = HttpClient::post(
        &server_id,
        "/assistant/_search",
        None,
        Some(reqwest::Body::from(body.to_string())),
    )
        .await
        .map_err(|e| format!("Error searching assistants: {}", e))?;

    response
        .json::<Value>()
        .await
        .map_err(|err| err.to_string())
}
