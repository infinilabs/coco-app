use crate::common::document::Document;
use crate::common::http::get_response_body_text;
use reqwest::Response;
use serde::de::Deserializer;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResponse<T> {
    pub took: Option<u64>,
    pub timed_out: Option<bool>,
    pub _shards: Option<Shards>,
    pub hits: Hits<T>,
    pub aggregations: Option<Aggregations>,
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
    pub hits: Option<Vec<SearchHit<T>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Total {
    pub value: u64,
    pub relation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit<T> {
    pub _index: Option<String>,
    pub _type: Option<String>,
    pub _id: Option<String>,
    pub _score: Option<f64>,
    pub _source: T, // This will hold the type we pass in (e.g., DataSource)
}
pub async fn parse_search_response<T>(
    response: Response,
) -> Result<SearchResponse<T>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    let body_text = get_response_body_text(response).await?;

    // dbg!(&body_text);

    let search_response: SearchResponse<T> = serde_json::from_str(&body_text)
        .map_err(|e| format!("Failed to deserialize search response: {}", e))?;

    Ok(search_response)
}

use serde::de::DeserializeOwned;

pub async fn parse_search_hits<T>(response: Response) -> Result<Vec<SearchHit<T>>, Box<dyn Error>>
where
    T: DeserializeOwned + std::fmt::Debug,
{
    let response = parse_search_response(response).await?;

    match response.hits.hits {
        Some(hits) => Ok(hits),
        None => Ok(Vec::new()),
    }
}

pub async fn parse_search_results<T>(response: Response) -> Result<Vec<T>, Box<dyn Error>>
where
    T: for<'de> Deserialize<'de> + std::fmt::Debug,
{
    Ok(parse_search_hits(response)
        .await?
        .into_iter()
        .map(|hit| hit._source)
        .collect())
}

#[derive(Debug, Clone, Serialize)]
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

#[derive(Debug, Clone, Serialize, Hash, PartialEq, Eq)]
pub struct QuerySource {
    pub r#type: String, //coco-server/local/ etc.
    pub id: String,     //coco server's id
    pub name: String,   //coco server's name, local computer name, etc.
}

#[derive(Debug, Clone, Serialize)]
pub struct QueryHits {
    pub source: Option<QuerySource>,
    pub score: f64,
    pub document: Document,
}

#[derive(Debug, Clone, Serialize)]
pub struct FailedRequest {
    pub source: QuerySource,
    pub status: u16,
    pub error: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Aggregation {
    buckets: Vec<AggBucket>,
}

/// A bucket's fields contain more than just "doc_count" and "key", but we only
/// need them. Serde can deserialize this as we don't `deny_unknown_fields`.
#[derive(Debug, Serialize, Clone)]
pub struct AggBucket {
    doc_count: usize,
    key: String,
    /// Optional human label extracted from `top.hits.hits[0]._source.source.name`.
    label: Option<String>,
}

impl<'de> Deserialize<'de> for AggBucket {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct Wrapper {
            doc_count: usize,
            key: String,
            #[serde(default)]
            top: Option<Top>,
        }

        #[derive(Deserialize)]
        struct Top {
            hits: TopHits,
        }

        #[derive(Deserialize)]
        struct TopHits {
            hits: Vec<TopHit>,
        }

        #[derive(Deserialize)]
        struct TopHit {
            #[serde(default)]
            _source: Option<TopSource>,
        }

        #[derive(Deserialize)]
        struct TopSource {
            #[serde(default)]
            source: Option<SourceLabel>,
        }

        #[derive(Deserialize)]
        struct SourceLabel {
            #[serde(default)]
            name: Option<String>,
        }

        let wrapper = Wrapper::deserialize(deserializer)?;

        let label = wrapper
            .top
            .and_then(|top| top.hits.hits.into_iter().next())
            .and_then(|hit| hit._source)
            .and_then(|src| src.source)
            .and_then(|lbl| lbl.name);

        Ok(AggBucket {
            doc_count: wrapper.doc_count,
            key: wrapper.key,
            label,
        })
    }
}

/// Coco server aggregation result.
///
/// ```json
/// {
///   "type": {
///     "buckets": [
///       {
///         "doc_count": 26,
///         "key": "web_page"
///       },
///       {
///         "doc_count": 1,
///         "key": "pdf"
///       }
///     ]
///   },
///   "lang": {
///     "buckets": [
///       {
///         "doc_count": 30,
///         "key": "en"
///       }
///     ]
///   }
/// }
/// ```
pub type Aggregations = HashMap<String, Aggregation>;

/// Merge the buckets in `from` to `to`.
pub(crate) fn merge_aggregations(to: &mut Option<Aggregations>, from: Aggregations) {
    use std::collections::hash_map::Entry;

    if from.is_empty() {
        return;
    }

    match to {
        None => {
            *to = Some(from);
        }
        Some(to_map) => {
            for (agg_name, agg) in from {
                match to_map.entry(agg_name) {
                    Entry::Occupied(mut occ) => {
                        let to_agg = occ.get_mut();

                        for bucket in agg.buckets {
                            if let Some(existing) = to_agg
                                .buckets
                                .iter_mut()
                                .find(|existing| existing.key == bucket.key)
                            {
                                existing.doc_count += bucket.doc_count;
                            } else {
                                to_agg.buckets.push(bucket);
                            }
                        }
                    }
                    Entry::Vacant(vacant) => {
                        vacant.insert(agg);
                    }
                };
            }
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct QueryResponse {
    pub source: QuerySource,
    pub hits: Vec<(Document, f64)>,
    pub total_hits: usize,
    pub aggregations: Option<Aggregations>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MultiSourceQueryResponse {
    pub failed: Vec<FailedRequest>,
    pub hits: Vec<QueryHits>,
    pub total_hits: usize,
    pub aggregations: Option<Aggregations>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    /// Helper function to create an `AggBucket`, used in tests.
    fn bucket(key: &str, doc_count: usize) -> AggBucket {
        AggBucket {
            key: key.to_string(),
            doc_count,
            label: None,
        }
    }

    /// Helper function to create an `Aggregation`, used in tests.
    fn agg_with_buckets(buckets: Vec<AggBucket>) -> Aggregation {
        Aggregation { buckets }
    }

    /// Helper function to get `doc_count` from the bucket specified by `key`.
    ///
    /// Utility for assertion.
    fn get_doc_count(agg: &Aggregation, key: &str) -> usize {
        agg.buckets
            .iter()
            .find(|b| b.key == key)
            .map(|b| b.doc_count)
            .unwrap()
    }

    #[test]
    fn merge_into_none_initializes() {
        let mut to: Option<Aggregations> = None;
        let mut from = Aggregations::new();
        from.insert("terms".to_string(), agg_with_buckets(vec![bucket("a", 2)]));

        merge_aggregations(&mut to, from);

        let terms = to.unwrap().get("terms").cloned().unwrap();
        assert_eq!(get_doc_count(&terms, "a"), 2);
    }

    #[test]
    fn merge_sums_and_appends_buckets() {
        let mut to_inner = Aggregations::new();
        to_inner.insert(
            "terms".to_string(),
            agg_with_buckets(vec![bucket("a", 1), bucket("b", 2)]),
        );
        let mut to = Some(to_inner);

        let mut from = Aggregations::new();
        from.insert(
            "terms".to_string(),
            agg_with_buckets(vec![bucket("a", 3), bucket("c", 5)]),
        );
        from.insert(
            "lang".to_string(),
            agg_with_buckets(vec![bucket("zh", 3), bucket("en", 5)]),
        );

        merge_aggregations(&mut to, from);

        let terms = to.as_ref().unwrap().get("terms").unwrap();
        assert_eq!(get_doc_count(terms, "a"), 4);
        assert_eq!(get_doc_count(terms, "b"), 2);
        assert_eq!(get_doc_count(terms, "c"), 5);
        let lang = to.as_ref().unwrap().get("lang").unwrap();
        assert_eq!(get_doc_count(lang, "zh"), 3);
        assert_eq!(get_doc_count(lang, "en"), 5);
    }

    #[test]
    fn deserialize_bucket_with_label() {
        let json = r#"
                {
                    "doc_count": 251,
                    "key": "d23ek9gqlqbcd9e3uiig",
                    "top": {
                        "hits": {
                            "hits": [
                                {
                                    "_source": {
                                        "source": {
                                            "name": "INFINI Easysearch"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
                "#;

        let bucket: AggBucket = serde_json::from_str(json).unwrap();
        assert_eq!(bucket.doc_count, 251);
        assert_eq!(bucket.key, "d23ek9gqlqbcd9e3uiig");
        assert_eq!(bucket.label.as_deref(), Some("INFINI Easysearch"));
    }

    #[test]
    fn deserialize_bucket_without_top_sets_label_none() {
        let json = r#"
                {
                    "doc_count": 10,
                    "key": "no-top"
                }
                "#;

        let bucket: AggBucket = serde_json::from_str(json).unwrap();
        assert_eq!(bucket.doc_count, 10);
        assert_eq!(bucket.key, "no-top");
        assert_eq!(bucket.label, None);
    }
}
