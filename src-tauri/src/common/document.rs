use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RichLabel {
    pub label: Option<String>,
    pub key: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSourceReference {
    pub r#type: Option<String>,
    pub name: Option<String>,
    pub id: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub avatar: Option<String>,
    pub username: Option<String>,
    pub userid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorInfo {
    pub user: UserInfo,
    pub timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub created: Option<String>,
    pub updated: Option<String>,
    pub source: Option<DataSourceReference>,
    pub r#type: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub categories: Option<Vec<String>>,
    pub rich_categories: Option<Vec<RichLabel>>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub lang: Option<String>,
    pub content: Option<String>,
    pub icon: Option<String>,
    pub thumbnail: Option<String>,
    pub cover: Option<String>,
    pub tags: Option<Vec<String>>,
    pub url: Option<String>,
    pub size: Option<i64>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    pub payload: Option<HashMap<String, serde_json::Value>>,
    pub owner: Option<UserInfo>,
    pub last_updated_by: Option<EditorInfo>,
}
impl Document {
    pub fn new(source: Option<DataSourceReference>, id: String, category: String, name: String, url: String) -> Self {
        Self {
            id,
            created: None,
            updated: None,
            source,
            r#type: None,
            category: Some(category),
            subcategory: None,
            categories: None,
            rich_categories: None,
            title: Some(name),
            summary: None,
            lang: None,
            content: None,
            icon: None,
            thumbnail: None,
            cover: None,
            tags: None,
            url: Some(url),
            size: None,
            metadata: None,
            payload: None,
            owner: None,
            last_updated_by: None,
        }
    }
}
