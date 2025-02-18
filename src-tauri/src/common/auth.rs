// use std::collections::HashMap;
use serde::{Deserialize, Serialize};
// use crate::common::health::Status;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestAccessTokenResponse {
    pub access_token: String,
    pub expire_at: u32,
}
