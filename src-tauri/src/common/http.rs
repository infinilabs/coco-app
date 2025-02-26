use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct GetResponse {
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
}