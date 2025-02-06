use std::collections::HashMap;
use ordered_float::OrderedFloat;
use reqwest::Method;
use serde::Serialize;
use tauri::{ AppHandle, Runtime};
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
use crate::server::http_client::{HttpClient, HTTP_CLIENT};
use crate::server::servers::{get_all_servers, get_server_token, get_servers_as_hashmap};
use futures::stream::{FuturesUnordered, StreamExt};

struct DocumentsSizedCollector {
    size: u64,
    /// Documents and socres
    ///
    /// Sorted by score, in descending order.
    docs: Vec<(JsonMap<String, Json>, OrderedFloat<f64>)>,
}

impl DocumentsSizedCollector {
    fn new(size: u64) -> Self {
        // there will be size + 1 documents in docs at max
        let docs = Vec::with_capacity((size + 1).try_into().expect("overflow"));

        Self { size, docs }
    }

    fn push(&mut self, item: JsonMap<String, Json>, score: f64) {
        let score = OrderedFloat(score);
        let insert_idx = match self.docs.binary_search_by(|(_doc, s)| score.cmp(s)) {
            Ok(idx) => idx,
            Err(idx) => idx,
        };

        self.docs.insert(insert_idx, (item, score));

        // cast usize to u64 is safe
        if self.docs.len() as u64 > self.size {
            self.docs.truncate(self.size.try_into().expect(
                "self.size < a number of type usize, it can be expressed using usize, we are safe",
            ));
        }
    }

    fn documents(self) -> impl ExactSizeIterator<Item = JsonMap<String, Json>> {
        self.docs.into_iter().map(|(doc, _score)| doc)
    }
}

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    failed_coco_servers: Vec<String>,
    documents: Vec<JsonMap<String, Json>>,
    total_hits: u64,
}


fn get_name(provider_info: &JsonMap<String, Json>) -> &str {
    provider_info
        .get("name")
        .expect("provider info does not have a [name] field")
        .as_str()
        .expect("field [name] should be a string")
}

fn get_public(provider_info: &JsonMap<String, Json>) -> bool {
    provider_info
        .get("public")
        .expect("provider info does not have a [public] field")
        .as_bool()
        .expect("field [public] should be a string")
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

    for (_,server) in coco_servers {
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
        let size=size_for_each_request.clone();
        let future = async move {
            let response = request_builder
                .query(&[("from", from.as_str()), ("size", size.as_str())])
                .query(&query_strings_cloned) // Use cloned instance
                .send()
                .await;
            (server.id, response)
        };

        futures.push(future);
    }

    let mut total_hits = 0;
    let mut failed_coco_servers = Vec::new();
    let mut docs_collector = DocumentsSizedCollector::new(size);

    while let Some((name, res_response)) = futures.next().await {
        match res_response {
            Ok(response) => {
                if let Ok(mut body) = response.json::<JsonMap<String, Json>>().await {
                    if let Some(Json::Object(mut hits)) = body.remove("hits") {
                        if let Some(Json::Number(hits_total_value)) = hits.get("total").and_then(|t| t.get("value")) {
                            if let Some(hits_total) = hits_total_value.as_u64() {
                                total_hits += hits_total;
                            }
                        }
                        if let Some(Json::Array(hits_hits)) = hits.remove("hits") {
                            for hit in hits_hits.into_iter().filter_map(|h| h.as_object().cloned()) {
                                if let (Some(Json::Number(score)), Some(Json::Object(source))) = (hit.get("_score"), hit.get("_source")) {
                                    if let Some(score_value) = score.as_f64() {
                                        docs_collector.push(source.clone(), score_value);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err(_) => failed_coco_servers.push(name),
        }
    }

    let docs=docs_collector.documents().collect();

    // dbg!(&total_hits);
    // dbg!(&failed_coco_servers);
    // dbg!(&docs);

    Ok(QueryResponse {
        failed_coco_servers,
        total_hits,
        documents:docs ,
    })
}



#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_docs_collector() {
        let mut collector = DocumentsSizedCollector::new(3);

        for i in 0..10 {
            collector.push(JsonMap::new(), i as f64);
        }

        assert_eq!(collector.docs.len(), 3);
        assert!(collector
            .docs
            .into_iter()
            .map(|(_doc, score)| score)
            .eq(vec![
                OrderedFloat(9.0),
                OrderedFloat(8.0),
                OrderedFloat(7.0)
            ]));
    }
}
