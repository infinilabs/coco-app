use crate::common::document::Document;
use crate::common::server::Server;
use crate::common::traits::{SearchError, SearchSource};
use crate::server::http_client::HttpClient;
use crate::server::servers::get_server_token;
use async_trait::async_trait;
use futures::stream::StreamExt;
use ordered_float::OrderedFloat;
use reqwest::{Client, Method, RequestBuilder};
use std::collections::HashMap;
use std::hash::Hash;
use std::pin::Pin;
use crate::common::search::{parse_search_response, QueryHits, QueryResponse, QuerySource, SearchQuery};
pub(crate) struct DocumentsSizedCollector {
    size: u64,
    /// Documents and scores
    ///
    /// Sorted by score, in descending order. (Server ID, Document, Score)
    docs: Vec<(String, Document, OrderedFloat<f64>)>,
}

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

    fn documents(self) -> impl ExactSizeIterator<Item=Document> {
        self.docs.into_iter().map(|(_, doc, _)| doc)
    }

    // New function to return documents grouped by server_id
    pub(crate) fn documents_with_sources(self, x: &HashMap<String, QuerySource>) -> Vec<QueryHits> {
        let mut grouped_docs: Vec<QueryHits> = Vec::new();

        for (source_id, doc, _) in self.docs.into_iter() {
            // Try to get the source from the hashmap
            let source = x.get(&source_id).cloned();

            // Push the document and source into the result
            grouped_docs.push(QueryHits {
                source,
                document: doc,
            });
        }

        grouped_docs
    }
}

const COCO_SERVERS: &str = "coco-servers";

pub struct CocoSearchSource {
    server: Server,
    client: Client,
}

impl CocoSearchSource {
    pub fn new(server: Server, client: Client) -> Self {
        CocoSearchSource { server, client }
    }

    fn build_request_from_query(&self, query: &SearchQuery) -> RequestBuilder {
        self.build_request(query.from, query.size, &query.query_strings)
    }

    fn build_request(&self, from: u64, size: u64, query_strings: &HashMap<String, String>) -> RequestBuilder {
        let url = HttpClient::join_url(&self.server.endpoint, "/query/_search");
        let mut request_builder = self.client.request(Method::GET, url);

        if !self.server.public {
            if let Some(token) = get_server_token(&self.server.id).map(|t| t.access_token) {
                request_builder = request_builder.header("X-API-TOKEN", token);
            }
        }

        request_builder.query(&[("from", &from.to_string()), ("size", &size.to_string())])
            .query(query_strings)
    }
}
use futures::future::join_all;
use std::sync::Arc;

#[async_trait]
impl SearchSource for CocoSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: COCO_SERVERS.into(),
            name: self.server.name.clone(),
            id: self.server.id.clone(),
        }
    }

    // Directly return Result<QueryResponse, SearchError> instead of Future
    async fn search(
        &self,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        let server_id = self.server.id.clone();
        let server_name = self.server.name.clone();
        let request_builder = self.build_request_from_query(&query);

        // Send the HTTP request asynchronously
        let response = request_builder.send().await;

        match response {
            Ok(response) => {
                let status_code = response.status().as_u16();

                if status_code >= 200 && status_code < 400 {
                    // Parse the response only if the status code is successful
                    match parse_search_response(response).await {
                        Ok(response) => {
                            let total_hits = response.hits.total.value as usize;
                            let hits: Vec<(Document, f64)> = response.hits.hits.into_iter()
                                .map(|hit| {
                                    // Handling Option<f64> in hit._score by defaulting to 0.0 if None
                                    (hit._source, hit._score.unwrap_or(0.0))  // Use 0.0 if _score is None
                                })
                                .collect();

                            // Return the QueryResponse with hits and total hits
                            Ok(QueryResponse {
                                source: self.get_type(),
                                hits,
                                total_hits,
                            })
                        }
                        Err(err) => {
                            // Parse error when response parsing fails
                            Err(SearchError::ParseError(err.to_string()))
                        }
                    }
                } else {
                    // Handle unsuccessful HTTP status codes (e.g., 4xx, 5xx)
                    Err(SearchError::HttpError(format!(
                        "Request failed with status code: {}",
                        status_code
                    )))
                }
            }
            Err(err) => {
                // Handle error from the request itself
                Err(SearchError::HttpError(err.to_string()))
            }
        }
    }
}