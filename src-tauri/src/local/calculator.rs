use super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::{
    document::{DataSourceReference, Document},
    error::SearchError,
    search::{QueryResponse, QuerySource, SearchQuery},
    traits::SearchSource,
};
use async_trait::async_trait;

const DATA_SOURCE_ID: &str = "Calculator";

pub struct CalculatorSource {
    base_score: f64,
}

impl CalculatorSource {
    pub fn new(base_score: f64) -> Self {
        CalculatorSource { base_score }
    }
}

#[async_trait]
impl SearchSource for CalculatorSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or(DATA_SOURCE_ID.into())
                .to_string_lossy()
                .into(),
            id: DATA_SOURCE_ID.into(),
        }
    }

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError> {
        let query_string = query
            .query_strings
            .get("query")
            .unwrap_or(&"".to_string())
            .to_string();

        if query_string.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        }

        let result =
            meval::eval_str(&query_string).map_err(|err| SearchError::Unknown(err.to_string()))?;

        let doc = Document::new(Document {
            id: result.to_string(),
            title: Some(query_string),
            content: Some(result.to_string()),
            category: Some(DATA_SOURCE_ID.to_string()),
            source: Some(DataSourceReference {
                r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                name: Some(DATA_SOURCE_ID.into()),
                id: Some(DATA_SOURCE_ID.into()),
                icon: None,
            }),
            ..Default::default()
        });

        Ok(QueryResponse {
            source: self.get_type(),
            hits: vec![(doc, self.base_score)],
            total_hits: 1,
        })
    }
}
