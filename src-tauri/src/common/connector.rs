use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Connector {
    pub id: String,
    pub created: Option<String>,
    pub updated: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub icon: Option<String>,
    pub tags: Option<Vec<String>>,
    pub url: Option<String>,
    pub assets: Option<ConnectorAssets>,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectorAssets {
    pub icons: Option<std::collections::HashMap<String, String>>,
}