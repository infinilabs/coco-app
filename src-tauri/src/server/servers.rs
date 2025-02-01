use crate::common::server::{AuthProvider, Provider, Server, Sso, Version};
use crate::util::http::HTTP_CLIENT;
use crate::{util, COCO_TAURI_STORE};
use core::panic;
use futures::stream::FuturesUnordered;
use futures::FutureExt;
use futures::StreamExt;
use futures::TryFutureExt;
use lazy_static::lazy_static;
use ordered_float::OrderedFloat;
use reqwest::Client;
use serde::Serialize;
use serde_json::{from_value, Map as JsonMap};
use serde_json::Value as Json;
use serde_json::{json, Value as JsonValue};
use std::collections::{HashMap, HashSet};
use std::fs::exists;
use std::sync::{Arc, Mutex};
use std::sync::{LazyLock, RwLock};
use tauri::AppHandle;
use tauri::Runtime;
use tauri_plugin_oauth::cancel;
use tauri_plugin_store::StoreExt;
use log::debug;
// Assuming you're using serde_json

lazy_static! {
    static ref SERVER_CACHE: Arc<RwLock<HashMap<String,Server>>> = Arc::new(RwLock::new(HashMap::new()));
}

fn check_server_exists(id: &str) -> bool {
    let cache = SERVER_CACHE.read().unwrap(); // Acquire read lock
    cache.contains_key(id)
}

fn check_endpoint_exists(endpoint: &str) -> bool {
    let cache = SERVER_CACHE.read().unwrap();
    cache.values().any(|server| server.endpoint == endpoint)
}

fn save_server_to_cache(server: Server) -> bool {
    let mut cache = SERVER_CACHE.write().unwrap();
    cache.insert(server.id.clone(), server).is_none() // If the server id did not exist, `insert` will return `None`
}

fn remove_server_by_id(id: String) -> bool {

    dbg!("remove server by id:", &id);

    let mut cache = SERVER_CACHE.write().unwrap();
    let deleted=cache.remove(id.as_str());
    deleted.is_some()
}


fn persist_servers<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), String> {
    let cache = SERVER_CACHE.read().unwrap(); // Acquire a read lock, not a write lock, since you're not modifying the cache

    // Convert HashMap to Vec for serialization (iterating over values of HashMap)
    let servers: Vec<Server> = cache.values().cloned().collect();

    // Serialize the servers into JSON automatically
    let json_servers: Vec<JsonValue> = servers
        .into_iter()
        .map(|server| serde_json::to_value(server).expect("Failed to serialize server")) // Automatically serialize all fields
        .collect();

    // Save the serialized servers to Tauri's store
    app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should never fail")
        .set(COCO_SERVERS, json_servers);

    Ok(())
}

/// Function to load servers or insert a default one if none exist
pub async fn load_or_insert_default_server<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Vec<Server>, String> {
    let store = app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should not fail");

    // Check if the servers key exists in the store
    if !store.has(COCO_SERVERS) {
        // No servers found, insert default
        let default_coco_server_endpoint = "https://coco.infini.cloud";

        let response = HTTP_CLIENT
            .get(provider_info_url(default_coco_server_endpoint))
            .send()
            .await
            .map_err(|_client_err| "Failed to send request to provider info")?;

        let mut default_coco_server: Server = response
            .json()
            .await
            .map_err(|_json_err| "Failed to parse response as JSON")?;

        // Ensure the endpoint is correctly formatted
        trim_endpoint_last_forward_slash(&mut default_coco_server);

        default_coco_server.id = "default_coco_server".to_string();
        default_coco_server.builtin = true;

        // Persist the new server to the store
        save_server_to_cache(default_coco_server.clone());

        dbg!(&default_coco_server);

        return Ok(vec![default_coco_server]); // Return early if we inserted the default server
    }

    // Load servers from store
    let servers: Option<JsonValue> = store.get(COCO_SERVERS);

    // Handle the None case
    let servers = servers.ok_or_else(|| "Failed to read servers from store: No servers found".to_string())?;

    // Convert each item in the JsonValue array to a Server
    if let JsonValue::Array(servers_array) = servers {
        // Deserialize each JsonValue into Server, filtering out any errors
        let deserialized_servers: Vec<Server> = servers_array
            .into_iter()
            .filter_map(|server_json| from_value(server_json).ok()) // Only keep valid Server instances
            .collect();

        if deserialized_servers.is_empty() {
            return Err("Failed to deserialize any servers from the store.".to_string());
        }

        for server in deserialized_servers.iter(){
            save_server_to_cache(server.clone());
        }

        dbg!(format!("load servers: {:?}", &deserialized_servers));

        return Ok(deserialized_servers);
    } else {
        Err("Failed to read servers from store: Invalid format".to_string())
    }
}

#[tauri::command]
pub async fn list_coco_servers<R: Runtime>(
    app_handle: AppHandle<R>,
)  -> Result<Vec<Server>, String> {
    load_or_insert_default_server(&app_handle).await
}

/// We store added Coco servers in the Tauri store using this key.
pub const COCO_SERVERS: &str = "coco_servers";

const COCO_SERVER_TOKENS: &str = "coco_server_tokens";

#[tauri::command]
pub async fn add_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    endpoint: String,
) -> Result<(), String> {

    load_or_insert_default_server(&app_handle).await.expect("failed to load default servers");

    // Change the error type to String
    // Remove the trailing '/' or our `xxx_url()` functions won't work
    let endpoint = endpoint.trim_end_matches('/');

    // Check if the server with this endpoint already exists
    if check_endpoint_exists(endpoint) {
        dbg!(format!("this Coco server has already been registered: {:?}", &endpoint));
        return Err("This Coco server has already been registered.".into());
    }

    // Try fetching the server information
    let response = util::http::HTTP_CLIENT
        .get(provider_info_url(&endpoint))
        .send()
        .await
        .expect("Failed to send request to the server");

    dbg!(format!("get provider info's response: {:?}", &response));

    // Deserialize the response into the `Server` struct
    let mut new_coco_server: Server = response
        .json()
        .await
        .expect("Failed to deserialize the response.");

    // Perform basic checks on the provider info if needed
    trim_endpoint_last_forward_slash(&mut new_coco_server);

    // Generate a unique ID for the new server (using the endpoint for now, or TODO use UUID)
    new_coco_server.id = endpoint.to_string(); // TODO: Use UUID for uniqueness
    if new_coco_server.name==""{
        new_coco_server.name="Coco Cloud".to_string();
    }

    // Save the new server to the cache
    save_server_to_cache(new_coco_server);

    // Persist the servers to the store
    persist_servers(&app_handle)
        .expect( "Failed to persist coco servers.");

    dbg!(format!("success to register server: {:?}", &endpoint));

    Ok(())
}

#[tauri::command]
pub async fn remove_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<(), ()> {
    remove_server_by_id(id);
    persist_servers(&app_handle).expect("failed to save servers");
    Ok(())
}

#[tauri::command]
pub fn store_coco_server_token(app_handle: AppHandle, endpoint: String, token: String) {
    println!(
        "DBG: store_coco_server_token, endpoint: {} token: {}",
        endpoint, token
    );

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

/// Removes the trailing slash from the server's endpoint if present.
fn trim_endpoint_last_forward_slash(server: &mut Server) {
    if server.endpoint.ends_with('/') {
        server.endpoint.pop(); // Remove the last character
        while server.endpoint.ends_with('/') {
            server.endpoint.pop();
        }
    }
}

/// Helper function to construct the provider info URL.
fn provider_info_url(endpoint: &str) -> String {
    format!("{endpoint}/provider/_info")
}

#[test]
fn test_trim_endpoint_last_forward_slash() {
    let mut server = Server {
        id: "test".to_string(),
        builtin: false,
        name: "".to_string(),
        endpoint: "https://example.com///".to_string(),
        provider: Provider {
            name: "".to_string(),
            icon: "".to_string(),
            website: "".to_string(),
            eula: "".to_string(),
            privacy_policy: "".to_string(),
            banner: "".to_string(),
            description: "".to_string(),
        },
        version: Version {
            number: "".to_string(),
        },
        updated: "".to_string(),
        public: false,
        auth_provider: AuthProvider {
            sso: Sso {
                url: "".to_string(),
            },
        },
    };

    trim_endpoint_last_forward_slash(&mut server);

    assert_eq!(server.endpoint, "https://example.com");
}
