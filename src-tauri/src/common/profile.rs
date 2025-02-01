use serde::{Serialize, Deserialize};

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct Preferences {
    pub theme: String,
    pub language: String,
}

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub preferences: Preferences,
}