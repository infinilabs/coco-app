use crate::common::document::{Document, OnOpened};
use crate::common::error::{HttpSnafu, ResponseDecodeSnafu, SearchError};
use crate::common::http::get_response_body_text;
use crate::common::search::{QueryHits, QueryResponse, QuerySource, SearchQuery, SearchResponse};
use crate::common::server::Server;
use crate::common::traits::SearchSource;
use crate::server::http_client::{HttpClient, HttpRequestError};
use async_trait::async_trait;
use ordered_float::OrderedFloat;
use reqwest::StatusCode;
use snafu::ResultExt;
use std::collections::HashMap;
use tauri::AppHandle;

#[allow(dead_code)]
pub(crate) struct DocumentsSizedCollector {
    size: u64,
    /// Documents and scores
    ///
    /// Sorted by score, in descending order. (Server ID, Document, Score)
    docs: Vec<(String, Document, OrderedFloat<f64>)>,
}

#[allow(dead_code)]
impl DocumentsSizedCollector {
    pub(crate) fn new(size: u64) -> Self {
        // there will be size + 1 documents in docs at max
        let docs = Vec::with_capacity((size + 1) as usize);

        Self { size, docs }
    }

    pub(crate) fn push(&mut self, source: String, item: Document, score: f64) {
        let score = OrderedFloat(score);
        let insert_idx = match self.docs.binary_search_by(|(_, _, s)| score.cmp(s)) {
            Ok(idx) => idx,
            Err(idx) => idx,
        };

        self.docs.insert(insert_idx, (source, item, score));

        // Ensure we do not exceed `size`
        if self.docs.len() as u64 > self.size {
            self.docs.truncate(self.size as usize);
        }
    }

    fn documents(self) -> impl ExactSizeIterator<Item = Document> {
        self.docs.into_iter().map(|(_, doc, _)| doc)
    }

    // New function to return documents grouped by server_id
    pub(crate) fn documents_with_sources(self, x: &HashMap<String, QuerySource>) -> Vec<QueryHits> {
        let mut grouped_docs: Vec<QueryHits> = Vec::new();

        for (source_id, doc, score) in self.docs.into_iter() {
            // Try to get the source from the hashmap
            let source = x.get(&source_id).cloned();

            // Push the document and source into the result
            grouped_docs.push(QueryHits {
                source,
                score: score.into_inner(),
                document: doc,
            });
        }

        grouped_docs
    }
}

const COCO_SERVERS: &str = "coco-servers";

pub struct CocoSearchSource {
    server: Server,
}

/// Convert frontend query string key/value into coco server query param.
/// Returns `None` when the key is not recognized.
fn convert_query_string(key: &str, value: &str) -> Option<String> {
    match key {
        // existing single-value params
        "querysource" | "datasource" | "query" | "fuzziness" => Some(format!("{}={}", key, value)),

        // time range filters (single value)
        "update_time_start" => Some(format!("filter=updated>={}", value)),
        "update_time_end" => Some(format!("filter=updated<={}", value)),
        "create_time_start" => Some(format!("filter=created>={}", value)),
        "create_time_end" => Some(format!("filter=created<={}", value)),

        // multi-value filters (value string may already contain any(...))
        "type" => Some(format!("filter=type:{}", value)),
        "source.id" => Some(format!("filter=source.id:{}", value)),
        "category" => Some(format!("filter=category:{}", value)),
        "subcategory" => Some(format!("filter=subcategory:{}", value)),
        "lang" => Some(format!("filter=lang:{}", value)),
        "tag" => Some(format!("filter=tag:{}", value)),

        _ => None,
    }
}

impl CocoSearchSource {
    pub fn new(server: Server) -> Self {
        CocoSearchSource { server }
    }
}

#[async_trait]
impl SearchSource for CocoSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: COCO_SERVERS.into(),
            name: self.server.name.clone(),
            id: self.server.id.clone(),
        }
    }

    async fn search(
        &self,
        _tauri_app_handle: AppHandle,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        let url = "/query/_search";
        let mut total_hits = 0;
        let mut hits: Vec<(Document, f64)> = Vec::new();
        let mut aggregations = None;

        let mut query_params = Vec::new();

        // Add from/size as number values
        query_params.push(format!("from={}", query.from));
        query_params.push(format!("size={}", query.size));

        // Add query strings
        for (key, value) in query.query_strings {
            if let Some(param) = convert_query_string(&key, &value) {
                query_params.push(param);
            }
        }
        println!("DBG: query params\n{:?}", query_params);

        let request_body = r#"
 {
  "aggs": {
    "category": {
      "terms": {
        "field": "category"
      }
    },
    "lang": {
      "terms": {
        "field": "lang"
      }
    },
    "source.id": {
      "terms": {
        "field": "source.id"
      },
      "aggs": {
        "top": {
          "top_hits": {
            "size": 1,
            "_source": [
              "source.name"
            ]
          }
        }
      }
    },
    "type": {
      "terms": {
        "field": "type"
      }
    }
  }
}"#;
        let response = HttpClient::post(
            &self.server.id,
            url,
            Some(query_params),
            Some(request_body.into()),
        )
        .await
        .context(HttpSnafu)?;
        let status_code = response.status();

        if ![StatusCode::OK, StatusCode::CREATED].contains(&status_code) {
            let http_err = HttpRequestError::RequestFailed {
                status: status_code.as_u16(),
                error_response_body_str: None,
                coco_server_api_error_response_body: None,
            };
            let search_err = SearchError::HttpError { source: http_err };
            return Err(search_err);
        }

        // Use the helper function to parse the response body
        let response_body = get_response_body_text(response).await.context(HttpSnafu)?;

        // Check if the response body is empty
        if !response_body.is_empty() {
            // log::info!("Search response body: {}", &response_body);

            // Parse the search response from the body text
            let parsed: SearchResponse<Document> =
                serde_json::from_str(&response_body).context(ResponseDecodeSnafu)?;

            // Process the parsed response
            total_hits = parsed.hits.total.value as usize;

            if let Some(items) = parsed.hits.hits {
                for hit in items {
                    let mut document = hit._source;
                    // Default _score to 0.0 if None
                    let score = hit._score.unwrap_or(0.0);

                    let on_opened = document
                        .url
                        .as_ref()
                        .map(|url| OnOpened::Document { url: url.clone() });
                    // Set the `on_opened` field as it won't be returned from Coco server
                    document.on_opened = on_opened;

                    hits.push((document, score));
                }
            }

            aggregations = parsed.aggregations;
        }

        // Return the final result
        Ok(QueryResponse {
            source: self.get_type(),
            hits,
            total_hits,
            aggregations,
        })
    }
}
