use std::error::Error;
use reqwest::Response;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
    pub _score: Option<f32>,
    pub _source: T, // This will hold the type we pass in (e.g., DataSource)
}
pub async fn parse_search_hits<T>(
    response: Response,
) -> Result<Vec<SearchHit<T>>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    let body = response
        .json::<Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let search_response: SearchResponse<T> = serde_json::from_value(body)
        .map_err(|e| format!("Failed to deserialize search response: {}", e))?;

    Ok(search_response.hits.hits)
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
) -> Result<Vec<(T, Option<f32>)>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    Ok(parse_search_hits(response).await?.into_iter().map(|hit| (hit._source, hit._score)).collect())
}