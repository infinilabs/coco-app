use crate::common::assistant::ChatRequestMessage;
use crate::common::http::convert_query_params_to_strings;
use crate::common::register::SearchSourceRegistry;
use crate::server::http_client::HttpClient;
use crate::{common, server::servers::COCO_SERVERS};
use futures::StreamExt;
use futures::stream::FuturesUnordered;
use futures_util::TryStreamExt;
use http::Method;
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncBufReadExt;

#[tauri::command]
pub async fn chat_history(
    _app_handle: AppHandle,
    server_id: String,
    from: u32,
    size: u32,
    query: Option<String>,
) -> Result<String, String> {
    let mut query_params = Vec::new();

    // Add from/size as number values
    query_params.push(format!("from={}", from));
    query_params.push(format!("size={}", size));

    if let Some(query) = query {
        if !query.is_empty() {
            query_params.push(format!("query={}", query.to_string()));
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
pub async fn session_chat_history(
    _app_handle: AppHandle,
    server_id: String,
    session_id: String,
    from: u32,
    size: u32,
) -> Result<String, String> {
    let mut query_params = Vec::new();

    // Add from/size as number values
    query_params.push(format!("from={}", from));
    query_params.push(format!("size={}", size));

    let path = format!("/chat/{}/_history", session_id);

    let response = HttpClient::get(&server_id, path.as_str(), Some(query_params))
        .await
        .map_err(|e| format!("Error get session message: {}", e))?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn open_session_chat(
    _app_handle: AppHandle,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let path = format!("/chat/{}/_open", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), None, None)
        .await
        .map_err(|e| format!("Error open session: {}", e))?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn close_session_chat(
    _app_handle: AppHandle,
    server_id: String,
    session_id: String,
) -> Result<String, String> {
    let path = format!("/chat/{}/_close", session_id);

    let response = HttpClient::post(&server_id, path.as_str(), None, None)
        .await
        .map_err(|e| format!("Error close session: {}", e))?;

    common::http::get_response_body_text(response).await
}
#[tauri::command]
pub async fn cancel_session_chat(
    _app_handle: AppHandle,
    server_id: String,
    session_id: String,
    query_params: Option<HashMap<String, Value>>,
) -> Result<String, String> {
    let path = format!("/chat/{}/_cancel", session_id);
    let query_params = convert_query_params_to_strings(query_params);

    let response = HttpClient::post(&server_id, path.as_str(), query_params, None)
        .await
        .map_err(|e| format!("Error cancel session: {}", e))?;

    common::http::get_response_body_text(response).await
}

#[tauri::command]
pub async fn chat_create(
    app_handle: AppHandle,
    server_id: String,
    message: String,
    query_params: Option<HashMap<String, Value>>,
    client_id: String,
) -> Result<(), String> {
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

    let response = HttpClient::advanced_post(
        &server_id,
        "/chat/_create",
        None,
        convert_query_params_to_strings(query_params),
        body,
    )
    .await
    .map_err(|e| format!("Error sending message: {}", e))?;

    if response.status() == 429 {
        log::warn!("Rate limit exceeded for chat create");
        return Err("Rate limited".to_string());
    }

    if !response.status().is_success() {
        return Err(format!("Request failed with status: {}", response.status()));
    }

    let stream = response.bytes_stream();
    let reader = tokio_util::io::StreamReader::new(
        stream.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
    );
    let mut lines = tokio::io::BufReader::new(reader).lines();

    log::info!("client_id_create: {}", &client_id);

    while let Ok(Some(line)) = lines.next_line().await {
        log::info!("Received chat stream line: {}", &line);

        if let Err(err) = app_handle.emit(&client_id, line) {
            log::error!("Emit failed: {:?}", err);

            print!("Error sending message: {:?}", err);

            let _ = app_handle.emit("chat-create-error", format!("Emit failed: {:?}", err));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn chat_chat(
    app_handle: AppHandle,
    server_id: String,
    session_id: String,
    message: String,
    query_params: Option<HashMap<String, Value>>, //search,deep_thinking
    client_id: String,
) -> Result<(), String> {
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

    let path = format!("/chat/{}/_chat", session_id);

    let response = HttpClient::advanced_post(
        &server_id,
        path.as_str(),
        None,
        convert_query_params_to_strings(query_params),
        body,
    )
    .await
    .map_err(|e| format!("Error sending message: {}", e))?;

    if response.status() == 429 {
        log::warn!("Rate limit exceeded for chat create");
        return Err("Rate limited".to_string());
    }

    if !response.status().is_success() {
        return Err(format!("Request failed with status: {}", response.status()));
    }

    let stream = response.bytes_stream();
    let reader = tokio_util::io::StreamReader::new(
        stream.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
    );
    let mut lines = tokio::io::BufReader::new(reader).lines();
    let mut first_log = true;

    log::info!("client_id: {}", &client_id);

    while let Ok(Some(line)) = lines.next_line().await {
        log::info!("Received chat stream line: {}", &line);
        if first_log {
            log::info!("first stream line: {}", &line);
            first_log = false;
        }

        if let Err(err) = app_handle.emit(&client_id, line) {
            log::error!("Emit failed: {:?}", err);
            let _ = app_handle.emit("chat-create-error", format!("Emit failed: {:?}", err));
        }
    }

    Ok(())
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
pub async fn assistant_search(
    _app_handle: AppHandle,
    server_id: String,
    query_params: Option<Vec<String>>,
) -> Result<Value, String> {
    let response = HttpClient::post(&server_id, "/assistant/_search", query_params, None)
        .await
        .map_err(|e| format!("Error searching assistants: {}", e))?;

    response
        .json::<Value>()
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn assistant_get(
    _app_handle: AppHandle,
    server_id: String,
    assistant_id: String,
) -> Result<Value, String> {
    let response = HttpClient::get(
        &server_id,
        &format!("/assistant/{}", assistant_id),
        None, // headers
    )
    .await
    .map_err(|e| format!("Error getting assistant: {}", e))?;

    response
        .json::<Value>()
        .await
        .map_err(|err| err.to_string())
}

/// Gets the information of the assistant specified by `assistant_id` by querying **all**
/// Coco servers.
///
/// Returns as soon as the assistant is found on any Coco server.
#[tauri::command]
pub async fn assistant_get_multi(
    app_handle: AppHandle,
    assistant_id: String,
) -> Result<Value, String> {
    let search_sources = app_handle.state::<SearchSourceRegistry>();
    let sources_future = search_sources.get_sources();
    let sources_list = sources_future.await;

    let mut futures = FuturesUnordered::new();

    for query_source in &sources_list {
        let query_source_type = query_source.get_type();
        if query_source_type.r#type != COCO_SERVERS {
            // Assistants only exists on Coco servers.
            continue;
        }

        let coco_server_id = query_source_type.id.clone();

        let path = format!("/assistant/{}", assistant_id);

        let fut = async move {
            let res_response = HttpClient::get(
                &coco_server_id,
                &path,
                None, // headers
            )
            .await;
            match res_response {
                Ok(response) => response
                    .json::<serde_json::Value>()
                    .await
                    .map_err(|e| e.to_string()),
                Err(e) => Err(e),
            }
        };

        futures.push(fut);
    }

    while let Some(res_response_json) = futures.next().await {
        let response_json = match res_response_json {
            Ok(json) => json,
            Err(e) => return Err(e),
        };

        // Example response JSON
        //
        // When assistant is not found:
        // ```json
        // {
        //   "_id": "ID",
        //   "result": "not_found"
        // }
        // ```
        //
        // When assistant is found:
        // ```json
        // {
        //   "_id": "ID",
        //   "_source": {...}
        //   "found": true
        // }
        // ```
        if let Some(found) = response_json.get("found") {
            if found == true {
                return Ok(response_json);
            }
        }
    }

    Err(format!(
        "could not find Assistant [{}] on all the Coco servers",
        assistant_id
    ))
}

use regex::Regex;
/// Remove all `"icon": "..."` fields from a JSON string
pub fn remove_icon_fields(json: &str) -> String {
    // Regex to match `"icon": "..."` fields, including base64 or escaped strings
    let re = Regex::new(r#""icon"\s*:\s*"[^"]*"(,?)"#).unwrap();
    // Replace with empty string, or just remove trailing comma if needed
    re.replace_all(json, |caps: &regex::Captures| {
        if &caps[1] == "," {
            "".to_string() // keep comma removal logic safe
        } else {
            "".to_string()
        }
    })
    .to_string()
}

#[tauri::command]
pub async fn ask_ai(
    app_handle: AppHandle,
    message: String,
    server_id: String,
    assistant_id: String,
    client_id: String,
) -> Result<(), String> {
    let cleaned = remove_icon_fields(message.as_str());

    let body = serde_json::json!({ "message": cleaned });

    let path = format!("/assistant/{}/_ask", assistant_id);

    println!("Sending request to {}", &path);

    let response = HttpClient::send_request(
        server_id.as_str(),
        Method::POST,
        path.as_str(),
        None,
        None,
        Some(reqwest::Body::from(body.to_string())),
    )
    .await?;

    if response.status() == 429 {
        log::warn!("Rate limit exceeded for assistant: {}", &assistant_id);
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
