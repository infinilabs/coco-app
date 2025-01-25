//! This file contains Rust APIs related to Coco Server management.

use crate::COCO_TAURI_STORE;
use core::panic;
use futures::stream::FuturesUnordered;
use futures::FutureExt;
use futures::StreamExt;
use futures::TryFutureExt;
use ordered_float::OrderedFloat;
use reqwest::Client;
use serde::Serialize;
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
use std::collections::HashMap;
use std::sync::LazyLock;
use tauri::AppHandle;
use tauri::Runtime;
use tauri_plugin_store::StoreExt;

static HTTP_CLIENT: LazyLock<Client> = LazyLock::new(|| Client::new());

/// We store added Coco servers in the Tauri store using this key.
const COCO_SERVERS: &str = "coco_servers";

const COCO_SERVER_TOKENS: &str = "coco_server_tokens";

/// Helper function to construct the provider info URL.
fn provider_info_url(endpoint: &str) -> String {
    format!("{endpoint}/provider/_info")
}

fn health_url(endpoint: &str) -> String {
    format!("{endpoint}/health")
}

fn search_url(endpoint: &str) -> String {
    format!("{endpoint}/query/_search")
}

fn get_endpoint(provider_info: &JsonMap<String, Json>) -> &str {
    provider_info
        .get("endpoint")
        .expect("provider info does not have a [endpoint] field")
        .as_str()
        .expect("field [endpoint] should be a string")
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
pub async fn add_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    endpoint: String,
) -> Result<(), ()> {
    // Remove the tailing '/' or our `xxx_url()` functions won't work
    let endpoint = endpoint.trim_end_matches('/');
    let mut coco_servers = _list_coco_servers(&app_handle).await?;

    if coco_servers
        .iter()
        .any(|server| get_endpoint(server) == endpoint)
    {
        todo!("duplicate")
    }

    let response = HTTP_CLIENT
        .get(provider_info_url(&endpoint))
        .send()
        .await
        .map_err(|_client_err| ())?;
    let new_coco_server: JsonMap<String, Json> = response
        .json()
        .await
        .expect("This provider returns invalid response");

    // TODO: do basic check to the provider info

    coco_servers.push(new_coco_server);

    Ok(())
}

#[tauri::command]
pub async fn remove_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    endpoint: String,
) -> Result<(), ()> {
    let mut coco_servers = _list_coco_servers(&app_handle).await?;

    let opt_position = coco_servers
        .iter()
        .position(|coco_server| get_endpoint(coco_server) == endpoint);
    let Some(position) = opt_position else {
        panic!(
            "trying to remove Coco server [{}], which does not exist",
            endpoint
        );
    };
    coco_servers.remove(position);

    app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should never fail")
        .set(COCO_SERVERS, coco_servers);

    Ok(())
}

#[tauri::command]
pub async fn list_coco_servers<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<Vec<JsonMap<String, Json>>, ()> {
    _list_coco_servers(&app_handle).await
}

#[tauri::command]
pub async fn get_coco_server_health_info(endpoint: String) -> bool {
    let response = match HTTP_CLIENT
        .get(health_url(&endpoint))
        .send()
        .map_err(|_request_err| ())
        .await
    {
        Ok(response) => response,
        Err(_) => return false,
    };
    let json: JsonMap<String, Json> = response.json().await.expect("invalid response");
    let status = json
        .get("status")
        .expect("response does not have a [status] field")
        .as_str()
        .expect("status field is not a string");

    status != "red"
}

#[tauri::command]
pub async fn get_coco_servers_health_info<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<HashMap<String, bool>, ()> {
    let coco_server_endpoints = _list_coco_server_endpoints(&app_handle).await?;

    let mut futures = FuturesUnordered::new();
    for coco_server_endpoint in coco_server_endpoints {
        let request_future = HTTP_CLIENT.get(health_url(&coco_server_endpoint)).send();
        futures.push(request_future.map(|request_result| (coco_server_endpoint, request_result)));
    }

    let mut health_info = HashMap::new();

    while let Some((endpoint, res_response)) = futures.next().await {
        let healthy = match res_response {
            Ok(response) => {
                let json: JsonMap<String, Json> = response.json().await.expect("invalid response");
                let status = json
                    .get("status")
                    .expect("response does not have a [status] field")
                    .as_str()
                    .expect("status field is not a string");
                status != "red"
            }
            Err(_) => false,
        };

        health_info.insert(endpoint, healthy);
    }

    Ok(health_info)
}

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

#[tauri::command]
pub async fn query_coco_servers<R: Runtime>(
    app_handle: AppHandle<R>,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
) -> Result<QueryResponse, ()> {
    let coco_servers = _list_coco_servers(&app_handle).await?;
    let tokens = get_coco_server_tokens(&app_handle);

    let mut futures = FuturesUnordered::new();

    let from_for_each_request = "0";
    let size_for_each_request = from + size;
    let size_for_each_request_str = size_for_each_request.to_string();
    for server in coco_servers {
        let endpoint = get_endpoint(&server).to_string();
        let public = get_public(&server);
        let name = get_name(&server).to_string();

        let mut request_builder = HTTP_CLIENT.get(search_url(&endpoint));
        if !public {
            let token = get_coco_server_token(&tokens, &endpoint)
                .unwrap_or_else(|| panic!("token of Coco server [{endpoint}] not found"));
            request_builder = request_builder.header("X-API-TOKEN", token);
        }
        let future = request_builder
            .query(&[
                ("from", from_for_each_request),
                ("size", size_for_each_request_str.as_str()),
            ])
            .query(&query_strings)
            .send();

        futures.push(future.map(|request_result| (name, request_result)));
    }

    let mut total_hits = 0;
    let mut failed_coco_servers = Vec::new();
    let mut docs_collector = DocumentsSizedCollector::new(size_for_each_request);

    while let Some((name, res_response)) = futures.next().await {
        match res_response {
            Ok(response) => {
                let mut body: JsonMap<String, Json> =
                    response.json().await.expect("invalid response");
                let mut hits = match body
                    .remove("hits")
                    .expect("invalid response, field [hits] not found")
                {
                    Json::Object(map) => map,
                    _ => panic!("field [hits] is not an object"),
                };
                let hits_total_value = hits
                    .get("total")
                    .expect("invalid response, field [hits.total] not found")
                    .get("value")
                    .expect("invalid response, field [hits.total.value] not found")
                    .as_u64()
                    .expect("invalid response, field [hits.total.value] is not an integer");
                total_hits += hits_total_value;

                let hits_hits = match hits
                    .remove("hits")
                    .expect("invalid response, field [hits.hits] not found")
                {
                    Json::Array(vec) => vec,
                    _ => panic!("invalid response, field [hits.hits] is not an array"),
                };

                for hit in hits_hits {
                    let mut hit = match hit {
                        Json::Object(map) => map,
                        _ => panic!("invalid response, returned hit is not an object"),
                    };

                    let score = hit
                        .get("_score")
                        .expect("invalid response, returned hit does not have a [_score] field")
                        .as_f64()
                        .expect("invalid response, field [_score] is not a floating number");

                    let source = match hit
                        .remove("_source")
                        .expect("invalid response, returned hit does not have a [_source] field")
                    {
                        Json::Object(map) => map,
                        _ => panic!("invalid response, field [_source] is not an object"),
                    };

                    docs_collector.push(source, score);
                }
            }
            Err(_) => failed_coco_servers.push(name),
        }
    }

    let documents = docs_collector.documents().collect();

    Ok(QueryResponse {
        failed_coco_servers,
        total_hits,
        documents,
    })
}

#[tauri::command]
pub async fn refresh_coco_server(
    app_handle: AppHandle,
    endpoint: String,
) -> Result<JsonMap<String, Json>, ()> {
    let mut coco_servers = _list_coco_servers(&app_handle).await?;

    let opt_index = coco_servers
        .iter()
        .position(|server| get_endpoint(server) == endpoint);
    let Some(index) = opt_index else {
        panic!("trying to refresh a Coco server that does not exist");
    };

    let response = HTTP_CLIENT
        .get(provider_info_url(&endpoint))
        .send()
        .await
        .map_err(|_client_err| ())?;
    let new_provider_info: JsonMap<String, Json> = response
        .json()
        .await
        .expect("This provider returns invalid response");

    coco_servers.insert(index, new_provider_info.clone());

    app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should never fail")
        .set(COCO_SERVERS, coco_servers);

    Ok(new_provider_info)
}

#[tauri::command]
pub fn store_coco_server_token(app_handle: AppHandle, endpoint: String, token: String) {
    let store = app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should not fail");
    let tokens = match store.get(COCO_SERVER_TOKENS) {
        Some(tokens) => match tokens {
            Json::Object(mut map) => {
                map.insert(endpoint, Json::String(token));
                map
            }
            _ => unreachable!("we store Coco server tokens in a map"),
        },
        None => {
            let mut new_map = JsonMap::new();
            new_map.insert(endpoint, Json::String(token));
            new_map
        }
    };

    store.set(COCO_SERVER_TOKENS, tokens);
}

fn get_coco_server_token<'token>(
    tokens: &'token JsonMap<String, Json>,
    endpoint: &str,
) -> Option<&'token str> {
    let token = match tokens.get(endpoint)? {
        Json::String(str) => str,
        _ => unreachable!(),
    };

    Some(token.as_str())
}

fn get_coco_server_tokens<R: Runtime>(app_handle: &AppHandle<R>) -> JsonMap<String, Json> {
    let store = app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should not fail");

    if !store.has(COCO_SERVER_TOKENS) {
        store.set(COCO_SERVER_TOKENS, JsonMap::new());
    }

    match store.get(COCO_SERVER_TOKENS) {
        Some(tokens) => match tokens {
            Json::Object(map) => return map,
            _ => unreachable!("we store Coco server tokens in a map"),
        },
        None => {
            unreachable!("unless there is a race, it should exist as we just created it")
        }
    };
}

async fn _list_coco_servers<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<Vec<JsonMap<String, Json>>, ()> {
    let store = app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should not fail");
    if !store.has(COCO_SERVERS) {
        let mut empty_vec: Vec<JsonMap<String, Json>> = Vec::new();

        let default_coco_server_endpoint = "https://coco.infini.cloud";
        let response = HTTP_CLIENT
            .get(provider_info_url(default_coco_server_endpoint))
            .send()
            .await
            .map_err(|_client_err| ())?;
        let default_coco_server: JsonMap<String, Json> = response
            .json()
            .await
            .expect("This provider returns invalid response");

        empty_vec.push(default_coco_server);

        store.set(COCO_SERVERS, empty_vec);
    }

    let coco_servers = match store.get(COCO_SERVERS) {
        Some(json) => match json {
            Json::Array(vec) => {
                let providers: Vec<JsonMap<String, Json>> = vec
                    .into_iter()
                    .map(|json| match json {
                        Json::Object(json_map) => json_map,
                        _ => unreachable!("provider info should be stored as a JsonMap"),
                    })
                    .collect();

                providers
            }
            _ => unreachable!("we store Coco server in an array"),
        },
        None => unreachable!(
            "unless there is a race, key COCO_SERVERS should exist as we just created it"
        ),
    };

    Ok(coco_servers)
}

async fn _list_coco_server_endpoints<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<impl ExactSizeIterator<Item = String>, ()> {
    let f = _list_coco_servers(app_handle)
        .await?
        .into_iter()
        .map(|mut provider_info| {
            let json = provider_info
                .remove("endpoint")
                .expect("provider info does not have a [endpoint] field");
            match json {
                Json::String(str) => str,
                _ => unreachable!("provider info should be stored as a string"),
            }
        });

    Ok(f)
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
