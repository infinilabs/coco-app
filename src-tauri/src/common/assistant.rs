use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequestMessage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<String>>,
}

#[allow(dead_code)]
pub struct NewChatResponse {
    pub _id: String,
    pub _source: Session,
    pub result: String,
    pub payload: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub created: String,
    pub updated: String,
    pub status: String,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub manually_renamed_title: bool,
    pub visible: Option<bool>,
    pub context: Option<SessionContext>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionContext {
    pub attachments: Option<Vec<String>>,
}
