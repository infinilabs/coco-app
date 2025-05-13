use crate::common::datasource::DataSource;
use crate::common::search::parse_search_results;
use crate::server::connector::get_connector_by_id;
use crate::server::http_client::HttpClient;
use crate::server::servers::get_all_servers;
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use tauri::{AppHandle, Runtime};

#[derive(serde::Deserialize, Debug)]
pub struct GetDatasourcesByServerOptions {
    pub from: Option<u32>,
    pub size: Option<u32>,
    pub query: Option<String>,
}

lazy_static! {
    static ref DATASOURCE_CACHE: Arc<RwLock<HashMap<String, HashMap<String, DataSource>>>> =
        Arc::new(RwLock::new(HashMap::new()));
}

pub fn save_datasource_to_cache(server_id: &str, datasources: Vec<DataSource>) {
    let mut cache = DATASOURCE_CACHE.write().unwrap(); // Acquire write lock
    let datasources_map: HashMap<String, DataSource> = datasources
        .into_iter()
        .map(|datasource| (datasource.id.clone(), datasource))
        .collect();
    cache.insert(server_id.to_string(), datasources_map);
}

#[allow(dead_code)]
pub fn get_datasources_from_cache(server_id: &str) -> Option<HashMap<String, DataSource>> {
    let cache = DATASOURCE_CACHE.read().unwrap(); // Acquire read lock
    // dbg!("cache: {:?}", &cache);
    let server_cache = cache.get(server_id)?; // Get the server's cache
    Some(server_cache.clone())
}

pub async fn refresh_all_datasources<R: Runtime>(_app_handle: &AppHandle<R>) -> Result<(), String> {
    // dbg!("Attempting to refresh all datasources");

    let servers = get_all_servers();

    let mut server_map = HashMap::new();

    for server in servers {
        // dbg!("fetch datasources for server: {}", &server.id);

        if !server.enabled {
            continue;
        }

        // Attempt to get datasources by server, and continue even if it fails
        let connectors = match datasource_search(server.id.as_str(), None).await {
            Ok(connectors) => {
                // Process connectors only after fetching them
                let connectors_map: HashMap<String, DataSource> = connectors
                    .into_iter()
                    .map(|connector| (connector.id.clone(), connector))
                    .collect();
                // dbg!("connectors_map: {:?}", &connectors_map);
                connectors_map
            }
            Err(_e) => {
                // dbg!("Failed to get dataSources for server {}: {}", &server.id, e);
                HashMap::new()
            }
        };

        let mut new_map = HashMap::new();
        for (id, datasource) in connectors.iter() {
            // dbg!("connector: {:?}", &datasource);
            if let Some(existing_connector) = get_connector_by_id(&server.id, &datasource.id) {
                // If found in cache, update the connector's info
                // dbg!("Found connector in cache for {}: {:?}", &datasource.id, &existing_connector);
                let mut obj = datasource.clone();
                obj.connector_info = Some(existing_connector);
                new_map.insert(id.clone(), obj);
            }
        }

        server_map.insert(server.id.clone(), new_map);
    }

    // Perform a read operation after all writes are done
    let _cache_size = {
        let mut cache = DATASOURCE_CACHE.write().unwrap();
        cache.clear();
        cache.extend(server_map);
        cache.len()
    };
    Ok(())
}

#[tauri::command]
pub async fn datasource_search(
    id: &str,
    options: Option<GetDatasourcesByServerOptions>,
) -> Result<Vec<DataSource>, String> {
    let from = options.as_ref().and_then(|opt| opt.from).unwrap_or(0);
    let size = options.as_ref().and_then(|opt| opt.size).unwrap_or(10000);
    let query = options
        .and_then(|opt| opt.query)
        .unwrap_or(String::default());

    let mut body = serde_json::json!({
        "from": from,
        "size": size,
    });

    if !query.is_empty() {
        body["query"] = serde_json::json!({
              "bool": {
                  "must": [{
                      "query_string": {
                          "fields": ["combined_fulltext"],
                          "query": query,
                          "fuzziness": "AUTO",
                          "fuzzy_prefix_length": 2,
                          "fuzzy_max_expansions": 10,
                          "fuzzy_transpositions": true,
                          "allow_leading_wildcard": false
                      }
                  }]
              }
        });
    }

    // Perform the async HTTP request outside the cache lock
    let resp = HttpClient::post(
        id,
        "/datasource/_search",
        None,
        Some(reqwest::Body::from(body.to_string())),
    )
        .await
        .map_err(|e| format!("Error fetching datasource: {}", e))?;

    // Parse the search results from the response
    let datasources: Vec<DataSource> = parse_search_results(resp).await.map_err(|e| {
        dbg!("Error parsing search results: {}", &e);
        e.to_string()
    })?;

    // Save the updated datasources to cache
    save_datasource_to_cache(&id, datasources.clone());

    Ok(datasources)
}

#[tauri::command]
pub async fn mcp_server_search(
    id: &str,
    options: Option<GetDatasourcesByServerOptions>,
) -> Result<Vec<DataSource>, String> {
    let from = options.as_ref().and_then(|opt| opt.from).unwrap_or(0);
    let size = options.as_ref().and_then(|opt| opt.size).unwrap_or(10000);
    let query = options
        .and_then(|opt| opt.query)
        .unwrap_or(String::default());

    let mut body = serde_json::json!({
        "from": from,
        "size": size,
    });

    if !query.is_empty() {
        body["query"] = serde_json::json!({
              "bool": {
                  "must": [{
                      "query_string": {
                          "fields": ["combined_fulltext"],
                          "query": query,
                          "fuzziness": "AUTO",
                          "fuzzy_prefix_length": 2,
                          "fuzzy_max_expansions": 10,
                          "fuzzy_transpositions": true,
                          "allow_leading_wildcard": false
                      }
                  }]
              }
        });
    }

    // Perform the async HTTP request outside the cache lock
    let resp = HttpClient::post(
        id,
        "/mcp_server/_search",
        None,
        Some(reqwest::Body::from(body.to_string())),
    )
        .await
        .map_err(|e| format!("Error fetching datasource: {}", e))?;

    // Parse the search results from the response
    let mcp_server: Vec<DataSource> = parse_search_results(resp).await.map_err(|e| {
        dbg!("Error parsing search results: {}", &e);
        e.to_string()
    })?;

    // Save the updated mcp_server to cache
    // save_datasource_to_cache(&id, mcp_server.clone());

    Ok(mcp_server)
}
