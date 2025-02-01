use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug,Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Green,
    Yellow,
    Red,
}

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct Health {
    pub services: HashMap<String, Status>,
    pub status: Status,
}
