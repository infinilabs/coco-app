use crate::common::http::get_response_body_text;
use crate::server::http_client::HttpClient;
use crate::server::servers::{get_server_by_id, get_server_token};
use base64::encode;
use reqwest::Method;
use serde_json::{Value, json};
use std::collections::HashMap;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_document_preview(
    _app_handle: AppHandle,
    server_id: String,
    document_id: String,
) -> Result<Value, String> {
    let response = HttpClient::get(&server_id, &format!("/document/{}", document_id), None)
        .await
        .map_err(|e| format!("Error fetching document: {}", e))?;

    let response_body = get_response_body_text(response)
        .await
        .map_err(|e| format!("Failed to read document response: {}", e))?;

    let document: Value = serde_json::from_str(&response_body)
        .map_err(|e| format!("Failed to parse document response: {}", e))?;

    let source = document.get("_source").cloned().unwrap_or(Value::Null);
    let owner_id = source
        .pointer("/_system/owner_id")
        .and_then(Value::as_str)
        .map(str::to_string);

    let owner = if let Some(owner_id) = owner_id {
        let owner_response = HttpClient::post(
            &server_id,
            &format!("/entity/card/user/{}", owner_id),
            None,
            None,
        )
        .await
        .map_err(|e| format!("Error fetching document owner: {}", e))?;

        let owner_body = get_response_body_text(owner_response)
            .await
            .map_err(|e| format!("Failed to read owner response: {}", e))?;

        serde_json::from_str::<Value>(&owner_body).unwrap_or(Value::Null)
    } else {
        Value::Null
    };

    Ok(json!({
        "document": document,
        "owner": owner,
    }))
}

#[tauri::command]
pub async fn fetch_document_preview_resource(
    _app_handle: AppHandle,
    server_id: String,
    url: String,
) -> Result<Value, String> {
    get_server_by_id(&server_id)
        .await
        .ok_or_else(|| format!("Server not found: {}", server_id))?;

    let response = if url.starts_with("http://") || url.starts_with("https://") {
        let mut headers = HashMap::new();
        if let Some(token) = get_server_token(&server_id).await {
            headers.insert("X-API-TOKEN".to_string(), token.access_token);
        }

        HttpClient::send_raw_request(Method::GET, &url, None, Some(headers), None).await
    } else {
        let path = HttpClient::join_url("/", &url);
        HttpClient::send_request(&server_id, Method::GET, &path, None, None, None).await
    }
    .map_err(|e| format!("Error fetching document resource: {}", e))?;

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read document resource: {}", e))?;

    Ok(json!({
        "contentType": content_type,
        "base64": encode(bytes),
    }))
}
