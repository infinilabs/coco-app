use super::servers::{get_server_by_id, get_server_token};
use crate::common::http::get_response_body_text;
use crate::server::http_client::HttpClient;
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, path::PathBuf};
use tauri::command;
use tokio::fs::File;
use tokio_util::codec::{BytesCodec, FramedRead};

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadAttachmentResponse {
    pub acknowledged: bool,
    pub attachments: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteAttachmentResponse {
    pub _id: String,
    pub result: String,
}

#[command]
pub async fn upload_attachment(
    server_id: String,
    file_paths: Vec<PathBuf>,
) -> Result<UploadAttachmentResponse, String> {
    let mut form = Form::new();

    for file_path in file_paths {
        let file = File::open(&file_path)
            .await
            .map_err(|err| err.to_string())?;

        let stream = FramedRead::new(file, BytesCodec::new());
        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid filename")?;

        let part =
            Part::stream(reqwest::Body::wrap_stream(stream)).file_name(file_name.to_string());

        form = form.part("files", part);
    }

    let server = get_server_by_id(&server_id).ok_or("Server not found")?;
    let url = HttpClient::join_url(&server.endpoint, &format!("attachment/_upload"));

    let token = get_server_token(&server_id).await?;
    let mut headers = HashMap::new();
    if let Some(token) = token {
        headers.insert("X-API-TOKEN".to_string(), token.access_token);
    }

    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .multipart(form)
        .headers((&headers).try_into().map_err(|err| format!("{}", err))?)
        .send()
        .await
        .map_err(|err| err.to_string())?;

    let body = get_response_body_text(response).await?;

    serde_json::from_str::<UploadAttachmentResponse>(&body)
        .map_err(|e| format!("Failed to parse upload response: {}", e))
}

#[command]
pub async fn get_attachment_by_ids(
    server_id: String,
    attachments: Vec<String>,
) -> Result<Value, String> {
    println!("get_attachment_by_ids server_id: {}", server_id);
    println!("get_attachment_by_ids attachments: {:?}", attachments);

    let request_body = serde_json::json!({
        "attachments": attachments
    });
    let body = reqwest::Body::from(serde_json::to_string(&request_body).unwrap());

    let response = HttpClient::post(&server_id, "/attachment/_search", None, Some(body))
        .await
        .map_err(|e| format!("Request error: {}", e))?;

    let body = get_response_body_text(response).await?;

    serde_json::from_str::<Value>(&body)
        .map_err(|e| format!("Failed to parse attachment response: {}", e))
}

#[command]
pub async fn delete_attachment(server_id: String, id: String) -> Result<bool, String> {
    let response = HttpClient::delete(&server_id, &format!("/attachment/{}", id), None, None)
        .await
        .map_err(|e| format!("Request error: {}", e))?;

    let body = get_response_body_text(response).await?;

    let parsed: DeleteAttachmentResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse delete response: {}", e))?;

    parsed
        .result
        .eq("deleted")
        .then_some(true)
        .ok_or_else(|| "Delete operation was not successful".to_string())
}
