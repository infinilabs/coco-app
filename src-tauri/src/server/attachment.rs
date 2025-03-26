use super::servers::{get_server_by_id, get_server_token};
use crate::server::http_client::HttpClient;
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::PathBuf};
use tauri::command;
use tokio::fs::File;
use tokio_util::codec::{BytesCodec, FramedRead};

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadAttachmentResponse {
    pub acknowledged: bool,
    pub attachments: Vec<String>,
}

#[command]
pub async fn upload_attachment(
    server_id: String,
    session_id: String,
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
    let url = HttpClient::join_url(&server.endpoint, &format!("chat/{}/_upload", session_id));

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

    if response.status().is_success() {
        let result = response
            .json::<UploadAttachmentResponse>()
            .await
            .map_err(|err| err.to_string())?;

        Ok(result)
    } else {
        Err(format!("Upload failed with status: {}", response.status()))
    }
}
