use std::hash::{Hash, Hasher};
use serde::{Deserialize, Serialize};

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct Provider {
    pub name: String,
    pub icon: String,
    pub website: String,
    pub eula: String,
    pub privacy_policy: String,
    pub banner: String,
    pub description: String,
}

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct Version {
    pub number: String,
}

#[derive(Debug, Clone,Serialize, Deserialize)]
pub struct Sso {
    pub url: String,
}

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct AuthProvider {
    pub sso: Sso,
}

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct Server {
    #[serde(default = "default_empty_string")] // Custom default function for empty string
    pub id: String,
    #[serde(default = "default_bool_type")]
    pub builtin: bool,
    pub name: String,
    pub endpoint: String,
    pub provider: Provider,
    pub version: Version,
    pub updated: String,
    #[serde(default = "default_bool_type")]
    pub public: bool,
    pub auth_provider: AuthProvider,
}

impl PartialEq for Server {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for Server {}

impl Hash for Server {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}


#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct ServerProfile {
    #[serde(default = "default_empty_string")] // Custom default function for empty string
    pub id: String,
    #[serde(default = "default_bool_type")] // Custom default function for empty string
    pub available: bool,
    #[serde(default = "default_bool_type")] // Custom default function for empty string
    pub public: bool,
    #[serde(default = "default_bool_type")] // Custom default function for empty string
    pub is_login: bool,
    pub access_token: String,
    pub expired_at: u32, //unix timestamp in seconds
    pub priority: u32,
}

impl PartialEq for ServerProfile {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for ServerProfile {}

impl Hash for ServerProfile {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}


fn default_empty_string() -> String {
    "".to_string()  // Default to empty string if not provided
}

fn default_bool_type() -> bool {
    false  // Default to false if not provided
}