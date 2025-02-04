use serde::{Deserialize, Serialize};
use crate::common::connector::Connector;

// The DataSource struct representing a datasource, which includes the Connector
#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct DataSource {
    pub id: String,
    pub created: Option<String>,
    pub updated: Option<String>,
    pub r#type: Option<String>, // Using 'r#type' to escape the reserved keyword 'type'
    pub name: Option<String>,
    pub connector: Option<ConnectorConfig>,
    pub connector_info: Option<Connector>,
}

#[derive(Debug,Clone, Serialize, Deserialize)]
pub struct ConnectorConfig {
    pub id: Option<String>,
    pub config: Option<serde_json::Value>, // Using serde_json::Value to handle any type of config
}