use super::servers::{get_server_by_id, get_server_token};
use crate::common::error::serialize_error;
use crate::common::http::get_response_body_text;
use crate::server::http_client::{HttpClient, HttpRequestError, SendSnafu};
use base64::{DecodeError, decode};
use reqwest::multipart::{Form, Part};
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use snafu::prelude::*;
use std::ffi::OsString;
use std::io;
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

#[derive(Debug, Serialize, Deserialize)]
pub struct FetchAttachmentTextResponse {
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FetchAttachmentBinaryResponse {
    pub content_base64: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteTextFileResponse {
    pub saved: bool,
}

#[derive(Debug, Snafu, Serialize)]
#[snafu(visibility(pub(crate)))]
pub(crate) enum AttachmentError {
    #[snafu(display("attachment file '{}' does not exist", file.display()))]
    FileNotFound { file: PathBuf },
    #[snafu(display("I/O error"))]
    Io {
        #[serde(serialize_with = "serialize_error")]
        source: io::Error,
    },
    #[snafu(display("attachment file '{}' does not have a name", file.display()))]
    NoFilename { file: PathBuf },
    #[snafu(display("attachment filename '{}' is not UTF-8 encoded", filename.display()))]
    NonUtf8Filename { filename: OsString },
    #[snafu(display("coco server with the specified ID filename '{}' does not exist", id))]
    ServerNotFound { id: String },
    #[snafu(display("HTTP request failed"))]
    HttpRequestError { source: HttpRequestError },
    #[snafu(display("decoding JSON failed"))]
    JsonDecodingError {
        #[serde(serialize_with = "serialize_error")]
        source: serde_json::Error,
    },
    #[snafu(display("decoding base64 failed"))]
    Base64DecodingError {
        #[serde(serialize_with = "serialize_error")]
        source: DecodeError,
    },
}

#[command]
pub async fn upload_attachment(
    server_id: String,
    file_paths: Vec<PathBuf>,
) -> Result<UploadAttachmentResponse, AttachmentError> {
    let mut form = Form::new();

    for file_path in file_paths {
        let file = match File::open(&file_path).await {
            Ok(file) => file,
            Err(io_err) => {
                let io_err_kind = io_err.kind();
                if io_err_kind == io::ErrorKind::NotFound {
                    return Err(AttachmentError::FileNotFound {
                        file: file_path.clone(),
                    });
                } else {
                    return Err(AttachmentError::Io { source: io_err });
                }
            }
        };

        let stream = FramedRead::new(file, BytesCodec::new());
        let file_name_os_str =
            file_path
                .file_name()
                .ok_or_else(|| AttachmentError::NoFilename {
                    file: file_path.clone(),
                })?;
        let file_name =
            file_name_os_str
                .to_str()
                .ok_or_else(|| AttachmentError::NonUtf8Filename {
                    filename: file_name_os_str.to_os_string(),
                })?;

        let part =
            Part::stream(reqwest::Body::wrap_stream(stream)).file_name(file_name.to_string());

        form = form.part("files", part);
    }

    let server =
        get_server_by_id(&server_id)
            .await
            .ok_or_else(|| AttachmentError::ServerNotFound {
                id: server_id.clone(),
            })?;
    let url = HttpClient::join_url(&server.endpoint, &format!("attachment/_upload"));

    let token = get_server_token(&server_id).await;
    let mut headers = HashMap::new();
    if let Some(token) = token {
        headers.insert("X-API-TOKEN".to_string(), token.access_token);
    }

    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .multipart(form)
        .headers((&headers).try_into().expect("conversion should not fail"))
        .send()
        .await
        .context(SendSnafu)
        .context(HttpRequestSnafu)?;

    let body = get_response_body_text(response)
        .await
        .context(HttpRequestSnafu)?;

    serde_json::from_str::<UploadAttachmentResponse>(&body).context(JsonDecodingSnafu)
}

#[command]
pub async fn get_attachment_by_ids(
    server_id: String,
    attachments: Vec<String>,
) -> Result<Value, AttachmentError> {
    println!("get_attachment_by_ids server_id: {}", server_id);
    println!("get_attachment_by_ids attachments: {:?}", attachments);

    let request_body = serde_json::json!({
        "attachments": attachments
    });
    let body = reqwest::Body::from(serde_json::to_string(&request_body).unwrap());

    let response = HttpClient::post(&server_id, "/attachment/_search", None, Some(body))
        .await
        .context(HttpRequestSnafu)?;

    let body = get_response_body_text(response)
        .await
        .context(HttpRequestSnafu)?;

    serde_json::from_str::<Value>(&body).context(JsonDecodingSnafu)
}

#[command]
pub async fn fetch_attachment_text(
    server_id: String,
    path: String,
) -> Result<FetchAttachmentTextResponse, AttachmentError> {
    let response = HttpClient::get(&server_id, &path, None)
        .await
        .context(HttpRequestSnafu)?;

    let content = get_response_body_text(response)
        .await
        .context(HttpRequestSnafu)?;

    Ok(FetchAttachmentTextResponse { content })
}

#[command]
pub async fn fetch_attachment_binary(
    server_id: String,
    path: String,
) -> Result<FetchAttachmentBinaryResponse, AttachmentError> {
    let response = HttpClient::get(&server_id, &path, None)
        .await
        .context(HttpRequestSnafu)?;

    let bytes = response.bytes().await.context(SendSnafu).context(HttpRequestSnafu)?;

    Ok(FetchAttachmentBinaryResponse {
        content_base64: base64::encode(bytes),
    })
}

#[command]
pub async fn write_text_file(
    path: PathBuf,
    content: String,
) -> Result<WriteTextFileResponse, AttachmentError> {
    tokio::fs::write(path, content).await.context(IoSnafu)?;

    Ok(WriteTextFileResponse { saved: true })
}

#[command]
pub async fn write_binary_file(
    path: PathBuf,
    content_base64: String,
) -> Result<WriteTextFileResponse, AttachmentError> {
    let content = decode(content_base64).context(Base64DecodingSnafu)?;

    tokio::fs::write(path, content).await.context(IoSnafu)?;

    Ok(WriteTextFileResponse { saved: true })
}

#[command]
pub async fn delete_attachment(server_id: String, id: String) -> Result<bool, AttachmentError> {
    let response = HttpClient::delete(&server_id, &format!("/attachment/{}", id), None, None)
        .await
        .context(HttpRequestSnafu)?;

    let body = get_response_body_text(response)
        .await
        .context(HttpRequestSnafu)?;

    let parsed: DeleteAttachmentResponse =
        serde_json::from_str(&body).context(JsonDecodingSnafu)?;

    Ok(parsed.result.eq("deleted"))
}
