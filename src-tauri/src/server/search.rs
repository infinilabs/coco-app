use std::collections::HashMap;
use std::hash::Hash;
use ordered_float::OrderedFloat;
use reqwest::Method;
use serde::Serialize;
use tauri::{AppHandle, Runtime};
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
use crate::server::http_client::{HttpClient, HTTP_CLIENT};
use crate::server::servers::{get_all_servers, get_server_token, get_servers_as_hashmap};
use futures::stream::{FuturesUnordered, StreamExt};
use crate::common::document::Document;
use crate::common::search_response::parse_search_results_with_score;
use crate::common::server::Server;

struct DocumentsSizedCollector {
    size: u64,
    /// Documents and scores
    ///
    /// Sorted by score, in descending order. (Server ID, Document, Score)
    docs: Vec<(String, Document, OrderedFloat<f64>)>,
}

impl DocumentsSizedCollector {
    fn new(size: u64) -> Self {
        // there will be size + 1 documents in docs at max
        let docs = Vec::with_capacity((size + 1) as usize);

        Self { size, docs }
    }

    fn push(&mut self, server_id: String, item: Document, score: f64) {
        let score = OrderedFloat(score);
        let insert_idx = match self.docs.binary_search_by(|(_, _, s)| score.cmp(s)) {
            Ok(idx) => idx,
            Err(idx) => idx,
        };

        self.docs.insert(insert_idx, (server_id, item, score));

        // Ensure we do not exceed `size`
        if self.docs.len() as u64 > self.size {
            self.docs.truncate(self.size as usize);
        }
    }

    fn documents(self) -> impl ExactSizeIterator<Item=Document> {
        self.docs.into_iter().map(|(_, doc, _)| doc)
    }

    // New function to return documents grouped by server_id
    fn documents_by_server_id(self, x: &HashMap<String, Server>) -> Vec<QueryHits> {
        let mut grouped_docs: Vec<QueryHits> = Vec::new();

        for (server_id, doc, _) in self.docs.into_iter() {
            let source= QuerySource {
                r#type: Some("coco-server".to_string()),
                name: Some(x.get(&server_id).map(|s| s.name.clone()).unwrap_or_default()),
                id: Some(server_id.clone()),
            };

            grouped_docs.push(QueryHits {
                source,
                document: doc,
            });
        }

        grouped_docs
    }
}

#[derive(Debug, Serialize)]
pub struct QuerySource{
    pub r#type: Option<String>, //coco-server/local/ etc.
    pub name: Option<String>, //coco server's name, local computer name, etc.
    pub id: Option<String>, //coco server's id
}

#[derive(Debug, Serialize)]
pub struct QueryHits {
    pub source: QuerySource,
    pub document: Document,
}

#[derive(Debug, Serialize)]
pub struct FailedRequest{
    pub source: QuerySource,
    pub status: u16,
    pub error: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    failed: Vec<FailedRequest>,
    hits: Vec<QueryHits>,
    total_hits: usize,
}


#[tauri::command]
pub async fn query_coco_servers<R: Runtime>(
    app_handle: AppHandle<R>,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
) -> Result<QueryResponse, ()> {
    println!(
        "DBG: query_coco_servers, from: {} size: {} query_strings {:?}",
        from, size, query_strings
    );

    let coco_servers = get_servers_as_hashmap();
    let mut futures = FuturesUnordered::new();
    let size_for_each_request = (from + size).to_string();

    for (_, server) in &coco_servers {
        let url = HttpClient::join_url(&server.endpoint, "/query/_search");
        let client = HTTP_CLIENT.lock().await; // Acquire the lock on HTTP_CLIENT
        let mut request_builder = client.request(Method::GET, url);

        if !server.public {
            if let Some(token) = get_server_token(&server.id).map(|t| t.access_token) {
                request_builder = request_builder.header("X-API-TOKEN", token);
            }
        }
        let query_strings_cloned = query_strings.clone(); // Clone for each iteration

        let from = from.to_string();
        let size = size_for_each_request.clone();
        let future = async move {
            let response = request_builder
                .query(&[("from", from.as_str()), ("size", size.as_str())])
                .query(&query_strings_cloned) // Use cloned instance
                .send()
                .await;
            (server.id.clone(), response)
        };

        futures.push(future);
    }

    let mut total_hits = 0;
    let mut failed_requests:Vec<FailedRequest> = Vec::new();
    let mut docs_collector = DocumentsSizedCollector::new(size);

    // Helper function to create failed request
    fn create_failed_request(server_id: &str, coco_servers: &HashMap<String,Server>, error: &str, status: u16) -> FailedRequest {
        FailedRequest {
            source: QuerySource {
                r#type: Some("coco-server".to_string()),
                name: Some(coco_servers.get(server_id).map(|s| s.name.clone()).unwrap_or_default()),
                id: Some(server_id.to_string()),
            },
            status,
            error: Some(error.to_string()),
            reason: None,
        }
    }

    // Iterate over the stream of futures
    while let Some((server_id, res_response)) = futures.next().await {
        match res_response {
            Ok(response) => {
                let status_code = response.status().as_u16();
                match parse_search_results_with_score(response).await {
                    Ok(documents) => {
                        total_hits += documents.len();  // No need for `&` here, as `len` is `usize`
                        for (doc, score) in documents {
                            let score = score.unwrap_or(0.0) as f64;
                            docs_collector.push(server_id.clone(), doc, score);
                        }
                    }
                    Err(err) => {
                        failed_requests.push(create_failed_request(&server_id, &coco_servers, &err.to_string(), status_code));
                    }
                }
            }
            Err(err) => {
                failed_requests.push(create_failed_request(&server_id,&coco_servers, &err.to_string(), 0));
            }
        }
    }

    let docs = docs_collector.documents_by_server_id(&coco_servers);

    // dbg!(&total_hits);
    // dbg!(&failed_requests);
    // dbg!(&docs);

    let query_response = QueryResponse {
        failed: failed_requests,
        hits: docs,
        total_hits,
    };

    //print to json
    // println!("{}", serde_json::to_string_pretty(&query_response).unwrap());

    Ok(query_response)
}
