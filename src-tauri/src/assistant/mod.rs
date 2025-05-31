use crate::common::assistant::ChatRequestMessage;
use crate::common::http::GetResponse;
use crate::common::register::SearchSourceRegistry;
use crate::server::http_client::HttpClient;
use crate::{common, server::servers::COCO_SERVERS};
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use futures_util::TryStreamExt;
use http::Method;
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio::io::AsyncBufReadExt;

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

    let chat_response: GetResponse = serde_json::from_str(&body_text)
        .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

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

#[tauri::command]
pub async fn assistant_get<R: Runtime>(
    _app_handle: AppHandle<R>,
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
pub async fn assistant_get_multi<R: Runtime>(
    app_handle: AppHandle<R>,
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
    }).to_string()
}

#[tauri::command]
pub async fn ask_ai<R: Runtime>(
    app_handle: AppHandle<R>,
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
