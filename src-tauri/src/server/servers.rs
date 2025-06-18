use crate::common::http::get_response_body_text;
use crate::common::register::SearchSourceRegistry;
use crate::common::server::{AuthProvider, Provider, Server, ServerAccessToken, Sso, Version};
use crate::server::connector::fetch_connectors_by_server;
use crate::server::datasource::datasource_search;
use crate::server::http_client::HttpClient;
use crate::server::search::CocoSearchSource;
use crate::COCO_TAURI_STORE;
use lazy_static::lazy_static;
use reqwest::Method;
use serde_json::from_value;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::RwLock;
use tauri::Runtime;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;
// Assuming you're using serde_json

lazy_static! {
    static ref SERVER_CACHE: Arc<RwLock<HashMap<String, Server>>> =
        Arc::new(RwLock::new(HashMap::new()));
    static ref SERVER_TOKEN: Arc<RwLock<HashMap<String, ServerAccessToken>>> =
        Arc::new(RwLock::new(HashMap::new()));
}

#[allow(dead_code)]
fn check_server_exists(id: &str) -> bool {
    let cache = SERVER_CACHE.read().unwrap(); // Acquire read lock
    cache.contains_key(id)
}

pub fn get_server_by_id(id: &str) -> Option<Server> {
    let cache = SERVER_CACHE.read().unwrap(); // Acquire read lock
    cache.get(id).cloned()
}

#[tauri::command]
pub async fn get_server_token(id: &str) -> Result<Option<ServerAccessToken>, String> {
    let cache = SERVER_TOKEN.read().map_err(|err| err.to_string())?;

    Ok(cache.get(id).cloned())
}

pub fn save_access_token(server_id: String, token: ServerAccessToken) -> bool {
    let mut cache = SERVER_TOKEN.write().unwrap();
    cache.insert(server_id, token).is_none()
}

fn check_endpoint_exists(endpoint: &str) -> bool {
    let cache = SERVER_CACHE.read().unwrap();
    cache.values().any(|server| server.endpoint == endpoint)
}

pub fn save_server(server: &Server) -> bool {
    let mut cache = SERVER_CACHE.write().unwrap();
    cache.insert(server.id.clone(), server.clone()).is_none() // If the server id did not exist, `insert` will return `None`
}

fn remove_server_by_id(id: String) -> bool {
    log::debug!("remove server by id: {}", &id);
    let mut cache = SERVER_CACHE.write().unwrap();
    let deleted = cache.remove(id.as_str());
    deleted.is_some()
}

pub async fn persist_servers<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), String> {
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

pub fn remove_server_token(id: &str) -> bool {
    log::debug!("remove server token by id: {}", &id);
    let mut cache = SERVER_TOKEN.write().unwrap();
    cache.remove(id).is_some()
}

pub fn persist_servers_token<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), String> {
    let cache = SERVER_TOKEN.read().unwrap(); // Acquire a read lock, not a write lock, since you're not modifying the cache

    // Convert HashMap to Vec for serialization (iterating over values of HashMap)
    let servers: Vec<ServerAccessToken> = cache.values().cloned().collect();

    // Serialize the servers into JSON automatically
    let json_servers: Vec<JsonValue> = servers
        .into_iter()
        .map(|server| serde_json::to_value(server).expect("Failed to serialize access_tokens")) // Automatically serialize all fields
        .collect();

    log::debug!("persist servers token: {:?}", &json_servers);

    // Save the serialized servers to Tauri's store
    app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should never fail")
        .set(COCO_SERVER_TOKENS, json_servers);

    Ok(())
}

// Function to get the default server if the request or parsing fails
fn get_default_server() -> Server {
    Server {
        id: "default_coco_server".to_string(),
        builtin: true,
        enabled: true,
        name: "Coco Cloud".to_string(),
        endpoint: "https://coco.infini.cloud".to_string(),
        provider: Provider {
            name: "INFINI Labs".to_string(),
            icon: "https://coco.infini.cloud/icon.png".to_string(),
            website: "http://infinilabs.com".to_string(),
            eula: "http://infinilabs.com/eula.txt".to_string(),
            privacy_policy: "http://infinilabs.com/privacy_policy.txt".to_string(),
            banner: "https://coco.infini.cloud/banner.jpg".to_string(),
            description: "Coco AI Server - Search, Connect, Collaborate, AI-powered enterprise search, all in one space.".to_string(),
        },
        version: Version {
            number: "1.0.0_SNAPSHOT".to_string(),
        },
        minimal_client_version: None,
        updated: "2025-01-24T12:12:17.326286927+08:00".to_string(),
        public: false,
        available: true,
        health: None,
        profile: None,
        auth_provider: AuthProvider {
            sso: Sso {
                url: "https://coco.infini.cloud/sso/login/cloud?provider=coco-cloud&product=coco".to_string(),
            },
        },
        priority: 0,
        stats: None,
    }
}

pub async fn load_servers_token<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<Vec<ServerAccessToken>, String> {
    log::debug!("Attempting to load servers token");

    let store = app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should not fail");

    // Check if the servers key exists in the store
    if !store.has(COCO_SERVER_TOKENS) {
        return Err("Failed to read servers from store: No servers found".to_string());
    }

    // Load servers from store
    let servers: Option<JsonValue> = store.get(COCO_SERVER_TOKENS);

    // Handle the None case
    let servers =
        servers.ok_or_else(|| "Failed to read servers from store: No servers found".to_string())?;

    // Convert each item in the JsonValue array to a Server
    if let JsonValue::Array(servers_array) = servers {
        // Deserialize each JsonValue into Server, filtering out any errors
        let deserialized_tokens: Vec<ServerAccessToken> = servers_array
            .into_iter()
            .filter_map(|server_json| from_value(server_json).ok()) // Only keep valid Server instances
            .collect();

        if deserialized_tokens.is_empty() {
            return Err("Failed to deserialize any servers from the store.".to_string());
        }

        for server in deserialized_tokens.iter() {
            save_access_token(server.id.clone(), server.clone());
        }

        log::debug!("loaded {:?} servers's token", &deserialized_tokens.len());

        Ok(deserialized_tokens)
    } else {
        Err("Failed to read servers from store: Invalid format".to_string())
    }
}

pub async fn load_servers<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Vec<Server>, String> {
    let store = app_handle
        .store(COCO_TAURI_STORE)
        .expect("create or load a store should not fail");

    // Check if the servers key exists in the store
    if !store.has(COCO_SERVERS) {
        return Err("Failed to read servers from store: No servers found".to_string());
    }

    // Load servers from store
    let servers: Option<JsonValue> = store.get(COCO_SERVERS);

    // Handle the None case
    let servers =
        servers.ok_or_else(|| "Failed to read servers from store: No servers found".to_string())?;

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

        for server in deserialized_servers.iter() {
            save_server(&server);
        }

        log::debug!("load servers: {:?}", &deserialized_servers);

        Ok(deserialized_servers)
    } else {
        Err("Failed to read servers from store: Invalid format".to_string())
    }
}

/// Function to load servers or insert a default one if none exist
pub async fn load_or_insert_default_server<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<Vec<Server>, String> {
    log::debug!("Attempting to load or insert default server");

    let exists_servers = load_servers(&app_handle).await;
    if exists_servers.is_ok() && !exists_servers.as_ref()?.is_empty() {
        log::debug!("loaded {} servers", &exists_servers.clone()?.len());
        return exists_servers;
    }

    let default = get_default_server();
    save_server(&default);

    log::debug!("loaded default servers");

    Ok(vec![default])
}

#[tauri::command]
pub async fn list_coco_servers<R: Runtime>(
    _app_handle: AppHandle<R>,
) -> Result<Vec<Server>, String> {
    //hard fresh all server's info, in order to get the actual health
    refresh_all_coco_server_info(_app_handle.clone()).await;

    let servers: Vec<Server> = get_all_servers();
    Ok(servers)
}

#[allow(dead_code)]
pub fn get_servers_as_hashmap() -> HashMap<String, Server> {
    let cache = SERVER_CACHE.read().unwrap();
    cache.clone()
}

pub fn get_all_servers() -> Vec<Server> {
    let cache = SERVER_CACHE.read().unwrap();
    cache.values().cloned().collect()
}

/// We store added Coco servers in the Tauri store using this key.
pub const COCO_SERVERS: &str = "coco_servers";

const COCO_SERVER_TOKENS: &str = "coco_server_tokens";

pub async fn refresh_all_coco_server_info<R: Runtime>(app_handle: AppHandle<R>) {
    let servers = get_all_servers();
    for server in servers {
        let _ = refresh_coco_server_info(app_handle.clone(), server.id.clone()).await;
    }
}

#[tauri::command]
pub async fn refresh_coco_server_info<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<Server, String> {
    // Retrieve the server from the cache
    let cached_server = {
        let cache = SERVER_CACHE.read().unwrap();
        cache.get(&id).cloned()
    };

    let server = match cached_server {
        Some(server) => server,
        None => return Err("Server not found.".into()),
    };

    // Preserve important local state
    let is_enabled = server.enabled;
    let is_builtin = server.builtin;
    let profile = server.profile;

    // Send request to fetch updated server info
    let response = HttpClient::get(&id, "/provider/_info", None)
        .await
        .map_err(|e| format!("Failed to contact the server: {}", e));

    if response.is_err() {
        let _ = mark_server_as_offline(app_handle, &id).await;
        return Err(response.err().unwrap());
    }

    let response = response?;

    if !response.status().is_success() {
        let _ = mark_server_as_offline(app_handle, &id).await;
        return Err(format!("Request failed with status: {}", response.status()));
    }

    // Get body text via helper
    let body = get_response_body_text(response).await?;

    // Deserialize server
    let mut updated_server: Server = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to deserialize the response: {}", e))?;

    // Mark server as online
    let _ = mark_server_as_online(app_handle.clone(), &id).await;

    // Restore local state
    updated_server.id = id.clone();
    updated_server.builtin = is_builtin;
    updated_server.enabled = is_enabled;
    updated_server.available = true;
    updated_server.profile = profile;
    trim_endpoint_last_forward_slash(&mut updated_server);

    // Save and persist
    save_server(&updated_server);
    persist_servers(&app_handle)
        .await
        .map_err(|e| format!("Failed to persist servers: {}", e))?;

    // Refresh connectors and datasources (best effort)
    let _ = fetch_connectors_by_server(&id).await;
    let _ = datasource_search(&id, None).await;

    Ok(updated_server)
}

#[tauri::command]
pub async fn add_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    endpoint: String,
) -> Result<Server, String> {
    load_or_insert_default_server(&app_handle)
        .await
        .map_err(|e| format!("Failed to load default servers: {}", e))?;

    let endpoint = endpoint.trim_end_matches('/');

    if check_endpoint_exists(endpoint) {
        log::debug!(
            "This Coco server has already been registered: {:?}",
            &endpoint
        );
        return Err("This Coco server has already been registered.".into());
    }

    let url = provider_info_url(endpoint);
    let response = HttpClient::send_raw_request(Method::GET, url.as_str(), None, None, None)
        .await
        .map_err(|e| format!("Failed to send request to the server: {}", e))?;

    log::debug!("Get provider info response: {:?}", &response);

    let body = get_response_body_text(response).await?;

    let mut server: Server = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to deserialize the response: {}", e))?;

    trim_endpoint_last_forward_slash(&mut server);

    if server.id.is_empty() {
        server.id = pizza_common::utils::uuid::Uuid::new().to_string();
    }

    if server.name.is_empty() {
        server.name = "Coco Server".to_string();
    }

    save_server(&server);
    try_register_server_to_search_source(app_handle.clone(), &server).await;

    persist_servers(&app_handle)
        .await
        .map_err(|e| format!("Failed to persist Coco servers: {}", e))?;

    log::debug!("Successfully registered server: {:?}", &endpoint);
    Ok(server)
}

#[tauri::command]
pub async fn remove_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<(), ()> {
    let registry = app_handle.state::<SearchSourceRegistry>();
    registry.remove_source(id.as_str()).await;

    remove_server_token(id.as_str());
    remove_server_by_id(id);

    persist_servers(&app_handle)
        .await
        .expect("failed to save servers");
    persist_servers_token(&app_handle).expect("failed to save server tokens");
    Ok(())
}

#[tauri::command]
pub async fn enable_server<R: Runtime>(app_handle: AppHandle<R>, id: String) -> Result<(), ()> {
    println!("enable_server: {}", id);

    let server = get_server_by_id(id.as_str());
    if let Some(mut server) = server {
        server.enabled = true;
        save_server(&server);

        // Register the server to the search source
        try_register_server_to_search_source(app_handle.clone(), &server).await;

        persist_servers(&app_handle)
            .await
            .expect("failed to save servers");
    }
    Ok(())
}

pub async fn try_register_server_to_search_source(
    app_handle: AppHandle<impl Runtime>,
    server: &Server,
) {
    if server.enabled {
        log::trace!(
            "Server {} is public: {} and available: {}",
            &server.name,
            &server.public,
            &server.available
        );

        if !server.public {
            let token = get_server_token(&server.id).await;

            if !token.is_ok() || token.is_ok() && token.unwrap().is_none() {
                log::debug!("Server {} is not public and no token was found", &server.id);
                return;
            }
        }

        let registry = app_handle.state::<SearchSourceRegistry>();
        let source = CocoSearchSource::new(server.clone());
        registry.register_source(source).await;
    }
}

#[tauri::command]
pub async fn mark_server_as_online<R: Runtime>(
    app_handle: AppHandle<R>, id: &str) -> Result<(), ()> {
    // println!("server_is_offline: {}", id);
    let server = get_server_by_id(id);
    if let Some(mut server) = server {
        server.available = true;
        server.health = None;
        save_server(&server);

        try_register_server_to_search_source(app_handle.clone(), &server).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn mark_server_as_offline<R: Runtime>(
    app_handle: AppHandle<R>,
    id: &str,
) -> Result<(), ()> {
    // println!("server_is_offline: {}", id);
    let server = get_server_by_id(id);
    if let Some(mut server) = server {
        server.available = false;
        server.health = None;
        save_server(&server);

        let registry = app_handle.state::<SearchSourceRegistry>();
        registry.remove_source(id).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn disable_server<R: Runtime>(app_handle: AppHandle<R>, id: String) -> Result<(), ()> {
    let server = get_server_by_id(id.as_str());
    if let Some(mut server) = server {
        server.enabled = false;

        let registry = app_handle.state::<SearchSourceRegistry>();
        registry.remove_source(id.as_str()).await;

        save_server(&server);
        persist_servers(&app_handle)
            .await
            .expect("failed to save servers");
    }
    Ok(())
}

#[tauri::command]
pub async fn logout_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<(), String> {
    log::debug!("Attempting to log out server by id: {}", &id);

    // Check if server token exists
    if let Some(_token) = get_server_token(id.as_str()).await? {
        log::debug!("Found server token for id: {}", &id);

        // Remove the server token from cache
        remove_server_token(id.as_str());

        // Persist the updated tokens
        if let Err(e) = persist_servers_token(&app_handle) {
            log::debug!("Failed to save tokens for id: {}. Error: {:?}", &id, &e);
            return Err(format!("Failed to save tokens: {}", &e));
        }
    } else {
        // Log the case where server token is not found
        log::debug!("No server token found for id: {}", &id);
    }

    // Check if the server exists
    if let Some(mut server) = get_server_by_id(id.as_str()) {
        log::debug!("Found server for id: {}", &id);

        // Clear server profile
        server.profile = None;
        let _ = mark_server_as_offline(app_handle.clone(), id.as_str()).await;

        // Save the updated server data
        save_server(&server);

        // Persist the updated server data
        if let Err(e) = persist_servers(&app_handle).await {
            log::debug!("Failed to save server for id: {}. Error: {:?}", &id, &e);
            return Err(format!("Failed to save server: {}", &e));
        }
    } else {
        // Log the case where server is not found
        log::debug!("No server found for id: {}", &id);
        return Err(format!("No server found for id: {}", id));
    }

    log::debug!("Successfully logged out server with id: {}", &id);
    Ok(())
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
        enabled: true,
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
        minimal_client_version: None,
        updated: "".to_string(),
        public: false,
        available: false,
        health: None,
        profile: None,
        auth_provider: AuthProvider {
            sso: Sso {
                url: "".to_string(),
            },
        },
        priority: 0,
        stats: None,
    };

    trim_endpoint_last_forward_slash(&mut server);

    assert_eq!(server.endpoint, "https://example.com");
}
