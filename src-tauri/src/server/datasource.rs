use crate::common::datasource::DataSource;
use crate::common::search_response::parse_search_results;
use crate::server::connector::{fetch_connectors_by_server, get_connector_by_id, get_connectors_by_server, get_connectors_from_cache_or_remote};
use crate::server::http_client::HttpClient;
use crate::server::servers::{get_all_servers, list_coco_servers};
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use tauri::{AppHandle, Runtime};
use crate::common::connector::Connector;

lazy_static! {
    static ref DATASOURCE_CACHE: Arc<RwLock<HashMap<String,HashMap<String,DataSource>>>> = Arc::new(RwLock::new(HashMap::new()));
}

pub fn save_datasource_to_cache(server_id: &str, datasources: Vec<DataSource>) {
    let mut cache = DATASOURCE_CACHE.write().unwrap(); // Acquire write lock
    let datasources_map: HashMap<String, DataSource> = datasources
        .into_iter()
        .map(|datasource| {
            (datasource.id.clone(), datasource)
        })
        .collect();
    cache.insert(server_id.to_string(), datasources_map);
}

pub fn get_datasources_from_cache(server_id: &str) -> Option<HashMap<String, DataSource>> {
    let cache = DATASOURCE_CACHE.read().unwrap(); // Acquire read lock
    dbg!("cache: {:?}", &cache);
    let server_cache = cache.get(server_id)?; // Get the server's cache
    Some(server_cache.clone())
}

pub async fn refresh_all_datasources<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<(), String> {
    dbg!("Attempting to refresh all datasources");

    let servers = get_all_servers();

    let mut serverMap = HashMap::new();

    for server in servers {
        dbg!("fetch datasources for server: {}", &server.id);

        // Attempt to get datasources by server, and continue even if it fails
        let mut connectors = match get_datasources_by_server(app_handle.clone(), server.id.clone()).await {
            Ok(connectors) => {
                // Process connectors only after fetching them
                let connectors_map: HashMap<String, DataSource> = connectors
                    .into_iter()
                    .map(|mut connector| {
                        (connector.id.clone(), connector)
                    })
                    .collect();
                dbg!("connectors_map: {:?}", &connectors_map);
                connectors_map
            }
            Err(e) => {
                dbg!("Failed to get dataSources for server {}: {}", &server.id, e);
                HashMap::new()
            }
        };

        let mut new_map = HashMap::new();
        for (id, mut datasource) in connectors.iter() {
            dbg!("connector: {:?}", &datasource);
            if let Some(existing_connector) = get_connector_by_id(&server.id, &datasource.id) {
                // If found in cache, update the connector's info
                dbg!("Found connector in cache for {}: {:?}", &datasource.id, &existing_connector);
                let mut obj = datasource.clone();
                obj.connector_info = Some(existing_connector);
                new_map.insert(id.clone(), obj);
            }
        }

        serverMap.insert(server.id.clone(), new_map);
    }

    // Perform a read operation after all writes are done
    let cache_size = {
        let mut cache = DATASOURCE_CACHE.write().unwrap();
        cache.clear();
        cache.extend(serverMap);
        cache.len()
    };
    dbg!("datasource_map size: {:?}", cache_size);

    Ok(())
}

#[tauri::command]
pub async fn get_datasources_by_server<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<Vec<DataSource>, String> {
    dbg!("get_datasources_by_server: id = {}", &id);

    // Perform the async HTTP request outside the cache lock
    let resp = HttpClient::get(&id, "/datasource/_search")
        .await
        .map_err(|e| {
            dbg!("Error fetching datasource: {}", &e);
            format!("Error fetching datasource: {}", e)
        })?;

    // Parse the search results from the response
    let mut datasources:Vec<DataSource> = parse_search_results(resp).await.map_err(|e| {
        dbg!("Error parsing search results: {}", &e);
        e.to_string()
    })?;

    // let connectors=fetch_connectors_by_server(id.as_str()).await?;
    //
    // // Convert the Vec<Connector> into HashMap<String, Connector>
    // let connectors_map: HashMap<String, Connector> = connectors
    //     .into_iter()
    //     .map(|connector| (connector.id.clone(), connector))  // Assuming Connector has an `id` field
    //     .collect();
    //
    // for datasource in datasources.iter_mut() {
    //     if let Some(connector) = &datasource.connector {
    //         if let Some(connector_id) = connector.id.as_ref() {
    //             if let Some(existing_connector) = connectors_map.get(connector_id) {
    //                 // If found in cache, update the connector's info
    //                 datasource.connector_info = Some(existing_connector.clone());
    //             }
    //         }
    //     }
    // }

    dbg!("Parsed datasources: {:?}", &datasources);

    // Save the updated datasources to cache
    save_datasource_to_cache(&id, datasources.clone());

    Ok(datasources)
}
