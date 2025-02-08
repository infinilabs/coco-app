use std::collections::HashMap;
use std::error::Error;
use reqwest::Response;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::common::document::Document;
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResponse<T> {
    pub took: u64,
    pub timed_out: bool,
    pub _shards: Shards,
    pub hits: Hits<T>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Shards {
    pub total: u64,
    pub successful: u64,
    pub skipped: u64,
    pub failed: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Hits<T> {
    pub total: Total,
    pub max_score: Option<f32>,
    pub hits: Vec<SearchHit<T>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Total {
    pub value: u64,
    pub relation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit<T> {
    pub _index: String,
    pub _type: String,
    pub _id: String,
    pub _score: Option<f64>,
    pub _source: T, // This will hold the type we pass in (e.g., DataSource)
}
pub async fn parse_search_response<T>(
    response: Response,
) -> Result<SearchResponse<T>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    let body = response
        .json::<Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let search_response: SearchResponse<T> = serde_json::from_value(body)
        .map_err(|e| format!("Failed to deserialize search response: {}", e))?;

    Ok(search_response)
}

pub async fn parse_search_hits<T>(
    response: Response,
) -> Result<Vec<SearchHit<T>>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    let response=parse_search_response(response).await?;

    Ok(response.hits.hits)
}

pub async fn parse_search_results<T>(
    response: Response,
) -> Result<Vec<T>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    Ok(parse_search_hits(response).await?.into_iter().map(|hit| hit._source).collect())
}

pub async fn parse_search_results_with_score<T>(
    response: Response,
) -> Result<Vec<(T, Option<f64>)>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    Ok(parse_search_hits(response).await?.into_iter().map(|hit| (hit._source, hit._score)).collect())
}

#[derive(Debug,Clone,Serialize)]
pub struct SearchQuery {
    pub from: u64,
    pub size: u64,
    pub query_strings: HashMap<String, String>,
}

impl SearchQuery {
    pub fn new(from: u64, size: u64, query_strings: HashMap<String, String>) -> Self {
        Self {
            from,
            size,
            query_strings,
        }
    }
}

#[derive(Debug,Clone, Serialize)]
pub struct QuerySource{
    pub r#type: String, //coco-server/local/ etc.
    pub id: String, //coco server's id
    pub name: String, //coco server's name, local computer name, etc.
}

#[derive(Debug,Clone, Serialize)]
pub struct QueryHits {
    pub source: Option<QuerySource>,
    pub document: Document,
}

#[derive(Debug,Clone, Serialize)]
pub struct FailedRequest{
    pub source: QuerySource,
    pub status: u16,
    pub error: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug,Clone, Serialize)]
pub struct QueryResponse {
    pub source: QuerySource,
    pub hits: Vec<(Document,f64)>,
    pub total_hits: usize,
}

#[derive(Debug,Clone, Serialize)]
pub struct MultiSourceQueryResponse {
    pub failed: Vec<FailedRequest>,
    pub hits: Vec<QueryHits>,
    pub total_hits: usize,
}

