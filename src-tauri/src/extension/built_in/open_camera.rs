use super::super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::{
    document::{DataSourceReference, Document},
    error::SearchError,
    search::{QueryResponse, QuerySource, SearchQuery},
    traits::SearchSource,
};
use crate::extension::calculate_text_similarity;
use async_trait::async_trait;
use tauri::AppHandle;

pub(crate) const EXTENSION_ID: &str = "OpenCamera";
const EXTENSION_NAME: &str = "Open Camera";
const EXTENSION_NAME_LOWERCASE: &str = "open camera";

/// JSON file for this extension.
pub(crate) const PLUGIN_JSON_FILE: &str = r#"
{
  "id": "OpenCamera",
  "name": "Open Camera",
  "platforms": ["macos", "linux", "windows"],
  "description": "Open the camera to check your appearance before video meetings, take quick photos, and toggle mirror mode.",
  "icon": "font_Camera",
  "type": "command",
  "enabled": true
}
"#;

/// Search source for the Open Camera extension.
pub(crate) struct OpenCameraSearchSource {
    base_score: f64,
}

impl OpenCameraSearchSource {
    pub fn new(base_score: f64) -> Self {
        OpenCameraSearchSource { base_score }
    }
}

#[async_trait]
impl SearchSource for OpenCameraSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or(EXTENSION_ID.into())
                .to_string_lossy()
                .into(),
            id: EXTENSION_ID.into(),
        }
    }

    async fn search(
        &self,
        _tauri_app_handle: AppHandle,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        let Some(query_string) = query.query_strings.get("query") else {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
                aggregations: None,
            });
        };

        let query_string = query_string.trim();
        if query_string.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
                aggregations: None,
            });
        }

        let query_string_lowercase = query_string.to_lowercase();

        // Match against the extension name and common aliases
        let search_terms = [
            EXTENSION_NAME_LOWERCASE,
            "camera",
            "webcam",
            "selfie",
            "photo",
            "摄像头",
            "拍照",
            "相机",
        ];

        let mut best_score = 0_f64;
        for term in &search_terms {
            if let Some(score) = calculate_text_similarity(&query_string_lowercase, term) {
                if score > best_score {
                    best_score = score;
                }
            }
        }

        if best_score <= 0.0 {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
                aggregations: None,
            });
        }

        let doc = Document {
            id: EXTENSION_ID.to_string(),
            title: Some(EXTENSION_NAME.to_string()),
            category: Some("Camera".to_string()),
            icon: Some("font_Camera".to_string()),
            source: Some(DataSourceReference {
                r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                name: Some(EXTENSION_ID.into()),
                id: Some(EXTENSION_ID.into()),
                icon: Some("font_Camera".to_string()),
            }),
            ..Default::default()
        };

        Ok(QueryResponse {
            source: self.get_type(),
            hits: vec![(doc, self.base_score * best_score)],
            total_hits: 1,
            aggregations: None,
        })
    }
}
