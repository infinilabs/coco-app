use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preferences {
    pub theme: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub name: String,
    pub email: String,
    pub avatar: Option<String>,
    pub preferences: Option<Preferences>,
}
