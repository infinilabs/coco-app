use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequestMessage {
    pub message: Option<String>,
}

#[allow(dead_code)]
pub struct NewChatResponse {
    pub _id: String,
    pub _source: Source,
    pub result: String,
    pub payload: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Source {
    pub id: String,
    pub created: String,
    pub updated: String,
    pub status: String,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub manually_renamed_title: bool,
}
