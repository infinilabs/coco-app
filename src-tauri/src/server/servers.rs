use crate::COCO_TAURI_STORE;
use crate::common::http::get_response_body_text;
use crate::common::register::SearchSourceRegistry;
use crate::common::server::{AuthProvider, Provider, Server, ServerAccessToken, Sso, Version};
use crate::server::connector::fetch_connectors_by_server;
use crate::server::datasource::datasource_search;
use crate::server::http_client::HttpClient;
use crate::server::search::CocoSearchSource;
use function_name;
use http::StatusCode;
use reqwest::Method;
use serde_json::Value as JsonValue;
use serde_json::from_value;
use std::collections::HashMap;
use std::sync::LazyLock;
use tauri::Runtime;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;
use tokio::sync::RwLock;

/// Coco sever list
static SERVER_LIST_CACHE: LazyLock<RwLock<HashMap<String, Server>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

/// If a server has a token stored here that has not expired, it is considered logged in.
///
/// Since the `expire_at` field of `struct ServerAccessToken` is currently unused,
/// all servers stored here are treated as logged in.
static SERVER_TOKEN_LIST_CACHE: LazyLock<RwLock<HashMap<String, ServerAccessToken>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

/// `SERVER_LIST_CACHE` will be stored in KV store COCO_TAURI_STORE, under this key.
pub const COCO_SERVERS: &str = "coco_servers";

/// `SERVER_TOKEN_LIST_CACHE` will be stored in KV store COCO_TAURI_STORE, under this key.
const COCO_SERVER_TOKENS: &str = "coco_server_tokens";

pub async fn get_server_by_id(id: &str) -> Option<Server> {
    let cache = SERVER_LIST_CACHE.read().await;
    cache.get(id).cloned()
}

pub async fn get_server_token(id: &str) -> Option<ServerAccessToken> {
    let cache = SERVER_TOKEN_LIST_CACHE.read().await;

    cache.get(id).cloned()
}

pub async fn save_access_token(server_id: String, token: ServerAccessToken) -> bool {
    let mut cache = SERVER_TOKEN_LIST_CACHE.write().await;
    cache.insert(server_id, token).is_none()
}

async fn check_endpoint_exists(endpoint: &str) -> bool {
    let cache = SERVER_LIST_CACHE.read().await;
    cache.values().any(|server| server.endpoint == endpoint)
}

/// Return true if `server` does not exists in the server list, i.e., it is a newly-added
/// server.
pub async fn save_server(server: &Server) -> bool {
    let mut cache = SERVER_LIST_CACHE.write().await;
    cache.insert(server.id.clone(), server.clone()).is_none()
}

/// Return the removed `Server` if it exists in the server list.
async fn remove_server_by_id(id: &str) -> Option<Server> {
    log::debug!("remove server by id: {}", &id);
    let mut cache = SERVER_LIST_CACHE.write().await;
    cache.remove(id)
}

pub async fn persist_servers<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), String> {
    let cache = SERVER_LIST_CACHE.read().await;

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

/// Return true if the server token of the server specified by `id` exists in
/// the token list and gets deleted.
pub async fn remove_server_token(id: &str) -> bool {
    log::debug!("remove server token by id: {}", &id);
    let mut cache = SERVER_TOKEN_LIST_CACHE.write().await;
    cache.remove(id).is_some()
}

pub async fn persist_servers_token<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), String> {
    let cache = SERVER_TOKEN_LIST_CACHE.read().await;

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
    match servers {
        JsonValue::Array(servers_array) => {
            let mut deserialized_tokens: Vec<ServerAccessToken> =
                Vec::with_capacity(servers_array.len());
            for server_json in servers_array {
                match from_value(server_json.clone()) {
                    Ok(token) => {
                        deserialized_tokens.push(token);
                    }
                    Err(e) => {
                        panic!(
                            "failed to deserialize JSON [{}] to [struct ServerAccessToken], error [{}], store [{}] key [{}] is possibly corrupted!",
                            server_json, e, COCO_TAURI_STORE, COCO_SERVER_TOKENS
                        );
                    }
                }
            }

            if deserialized_tokens.is_empty() {
                return Err("Failed to deserialize any servers from the store.".to_string());
            }

            for server in deserialized_tokens.iter() {
                save_access_token(server.id.clone(), server.clone()).await;
            }

            log::debug!("loaded {:?} servers's token", &deserialized_tokens.len());

            Ok(deserialized_tokens)
        }
        _ => {
            unreachable!(
                "coco server tokens should be stored in an array under store [{}] key [{}], but it is not",
                COCO_TAURI_STORE, COCO_SERVER_TOKENS
            );
        }
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
    match servers {
        JsonValue::Array(servers_array) => {
            let mut deserialized_servers = Vec::with_capacity(servers_array.len());
            for server_json in servers_array {
                match from_value(server_json.clone()) {
                    Ok(server) => {
                        deserialized_servers.push(server);
                    }
                    Err(e) => {
                        panic!(
                            "failed to deserialize JSON [{}] to [struct Server], error [{}], store [{}] key [{}] is possibly corrupted!",
                            server_json, e, COCO_TAURI_STORE, COCO_SERVERS
                        );
                    }
                }
            }

            if deserialized_servers.is_empty() {
                return Err("Failed to deserialize any servers from the store.".to_string());
            }

            for server in deserialized_servers.iter() {
                save_server(&server).await;
            }

            log::debug!("load servers: {:?}", &deserialized_servers);

            Ok(deserialized_servers)
        }
        _ => {
            unreachable!(
                "coco servers should be stored in an array under store [{}] key [{}], but it is not",
                COCO_TAURI_STORE, COCO_SERVERS
            );
        }
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
    save_server(&default).await;

    log::debug!("loaded default servers");

    Ok(vec![default])
}

#[tauri::command]
pub async fn list_coco_servers<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<Vec<Server>, String> {
    //hard fresh all server's info, in order to get the actual health
    refresh_all_coco_server_info(app_handle.clone()).await;

    let servers: Vec<Server> = get_all_servers().await;
    Ok(servers)
}

pub async fn get_all_servers() -> Vec<Server> {
    let cache = SERVER_LIST_CACHE.read().await;
    cache.values().cloned().collect()
}

pub async fn refresh_all_coco_server_info<R: Runtime>(app_handle: AppHandle<R>) {
    let servers = get_all_servers().await;
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
        let cache = SERVER_LIST_CACHE.read().await;
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
    let response = match HttpClient::get(&id, "/provider/_info", None).await {
        Ok(response) => response,
        Err(e) => {
            mark_server_as_offline(app_handle, &id).await;
            return Err(e);
        }
    };

    if !response.status().is_success() {
        mark_server_as_offline(app_handle, &id).await;
        return Err(format!("Request failed with status: {}", response.status()));
    }

    // Get body text via helper
    let body = get_response_body_text(response).await?;

    // Deserialize server
    let mut updated_server: Server = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to deserialize the response: {}", e))?;

    // Restore local state
    updated_server.id = id.clone();
    updated_server.builtin = is_builtin;
    updated_server.enabled = is_enabled;
    updated_server.available = {
        if server.public {
            // Public Coco servers are available as long as they are online.
            true
        } else {
            // For non-public Coco servers, we still need to check if it is
            // logged in, i.e., has a token stored in `SERVER_TOKEN_LIST_CACHE`.
            get_server_token(&id).await.is_some()
        }
    };
    updated_server.profile = profile;
    trim_endpoint_last_forward_slash(&mut updated_server);

    // Save and persist
    save_server(&updated_server).await;
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

    if check_endpoint_exists(endpoint).await {
        log::debug!(
            "trying to register a Coco server [{}] that has already been registered",
            endpoint
        );
        return Err("This Coco server has already been registered.".into());
    }

    let url = provider_info_url(endpoint);
    let response = HttpClient::send_raw_request(Method::GET, url.as_str(), None, None, None)
        .await
        .map_err(|e| format!("Failed to send request to the server: {}", e))?;

    log::debug!("Get provider info response: {:?}", &response);

    if response.status() != StatusCode::OK {
        log::debug!(
            "trying to register a Coco server [{}] that is possibly down",
            endpoint
        );

        return Err("This Coco server is possibly down".into());
    }

    let body = get_response_body_text(response).await?;

    let mut server: Server = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to deserialize the response: {}", e))?;

    trim_endpoint_last_forward_slash(&mut server);

    // The JSON returned from `provider/_info` won't have this field, serde will set
    // it to an empty string during deserialization, we need to set a valid value here.
    if server.id.is_empty() {
        server.id = pizza_common::utils::uuid::Uuid::new().to_string();
    }

    // Use the default name, if it is not set.
    if server.name.is_empty() {
        server.name = "Coco Server".to_string();
    }

    // Update the `available` field
    if server.public {
        // Serde already sets this to true, but just to make the code clear, do it again.
        server.available = true;
    } else {
        let opt_token = get_server_token(&server.id).await;
        assert!(
            opt_token.is_none(),
            "this Coco server is newly-added, we should have no token stored for it!"
        );
        // This is a non-public Coco server, and it is not logged in, so it is unavailable.
        server.available = false;
    }

    save_server(&server).await;
    try_register_server_to_search_source(app_handle.clone(), &server).await;

    persist_servers(&app_handle)
        .await
        .map_err(|e| format!("Failed to persist Coco servers: {}", e))?;

    log::debug!("Successfully registered server: {:?}", &endpoint);
    Ok(server)
}

#[tauri::command]
#[function_name::named]
pub async fn remove_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<(), ()> {
    let registry = app_handle.state::<SearchSourceRegistry>();
    registry.remove_source(id.as_str()).await;

    let opt_server = remove_server_by_id(id.as_str()).await;
    let Some(server) = opt_server else {
        panic!(
            "[{}()] invoked with a server [{}] that does not exist! Mismatched states between frontend and backend!",
            function_name!(),
            id
        );
    };
    persist_servers(&app_handle)
        .await
        .expect("failed to save servers");

    // Only non-public Coco servers require tokens
    if !server.public {
        // If is logged in, clear the token as well.
        let deleted = remove_server_token(id.as_str()).await;
        if deleted {
            persist_servers_token(&app_handle)
                .await
                .expect("failed to save server tokens");
        }
    }

    Ok(())
}

#[tauri::command]
#[function_name::named]
pub async fn enable_server<R: Runtime>(app_handle: AppHandle<R>, id: String) -> Result<(), ()> {
    let opt_server = get_server_by_id(id.as_str()).await;

    let Some(mut server) = opt_server else {
        panic!(
            "[{}()] invoked with a server [{}] that does not exist! Mismatched states between frontend and backend!",
            function_name!(),
            id
        );
    };

    server.enabled = true;
    save_server(&server).await;

    // Register the server to the search source
    try_register_server_to_search_source(app_handle.clone(), &server).await;

    persist_servers(&app_handle)
        .await
        .expect("failed to save servers");
    Ok(())
}

#[tauri::command]
#[function_name::named]
pub async fn disable_server<R: Runtime>(app_handle: AppHandle<R>, id: String) -> Result<(), ()> {
    let opt_server = get_server_by_id(id.as_str()).await;

    let Some(mut server) = opt_server else {
        panic!(
            "[{}()] invoked with a server [{}] that does not exist! Mismatched states between frontend and backend!",
            function_name!(),
            id
        );
    };

    server.enabled = false;

    let registry = app_handle.state::<SearchSourceRegistry>();
    registry.remove_source(id.as_str()).await;

    save_server(&server).await;
    persist_servers(&app_handle)
        .await
        .expect("failed to save servers");

    Ok(())
}

/// For non-public Coco servers, we add it to the search source as long as it is
/// enabled.
///
/// For public Coco server, an extra token is required.
pub async fn try_register_server_to_search_source(
    app_handle: AppHandle<impl Runtime>,
    server: &Server,
) {
    if server.enabled {
        log::trace!(
            "Server [name: {}, id: {}] is public: {} and available: {}",
            &server.name,
            &server.id,
            &server.public,
            &server.available
        );

        if !server.public {
            let opt_token = get_server_token(&server.id).await;

            if opt_token.is_none() {
                log::debug!("Server {} is not public and no token was found", &server.id);
                return;
            }
        }

        let registry = app_handle.state::<SearchSourceRegistry>();
        let source = CocoSearchSource::new(server.clone());
        registry.register_source(source).await;
    }
}

#[function_name::named]
#[allow(unused)]
async fn mark_server_as_online<R: Runtime>(app_handle: AppHandle<R>, id: &str) {
    let server = get_server_by_id(id).await;
    if let Some(mut server) = server {
        server.available = true;
        server.health = None;
        save_server(&server).await;

        try_register_server_to_search_source(app_handle.clone(), &server).await;
    } else {
        log::warn!(
            "[{}()] invoked with a server [{}] that does not exist!",
            function_name!(),
            id
        );
    }
}

#[function_name::named]
pub(crate) async fn mark_server_as_offline<R: Runtime>(app_handle: AppHandle<R>, id: &str) {
    let server = get_server_by_id(id).await;
    if let Some(mut server) = server {
        server.available = false;
        server.health = None;
        save_server(&server).await;

        let registry = app_handle.state::<SearchSourceRegistry>();
        registry.remove_source(id).await;
    } else {
        log::warn!(
            "[{}()] invoked with a server [{}] that does not exist!",
            function_name!(),
            id
        );
    }
}

#[tauri::command]
#[function_name::named]
pub async fn logout_coco_server<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<(), String> {
    log::debug!("Attempting to log out server by id: {}", &id);

    // Check if the server exists
    let Some(mut server) = get_server_by_id(id.as_str()).await else {
        panic!(
            "[{}()] invoked with a server [{}] that does not exist! Mismatched states between frontend and backend!",
            function_name!(),
            id
        );
    };

    // Clear server profile
    server.profile = None;
    // Logging out from a non-public Coco server makes it unavailable
    if !server.public {
        server.available = false;
    }
    // Save the updated server data
    save_server(&server).await;
    // Persist the updated server data
    if let Err(e) = persist_servers(&app_handle).await {
        log::debug!("Failed to save server for id: {}. Error: {:?}", &id, &e);
        return Err(format!("Failed to save server: {}", &e));
    }

    let has_token = get_server_token(id.as_str()).await.is_some();
    if server.public {
        if has_token {
            panic!("Public Coco server won't have token")
        }
    } else {
        assert!(
            has_token,
            "This is a non-public Coco server, and it is logged in, we should have a token"
        );
        // Remove the server token from cache
        remove_server_token(id.as_str()).await;

        // Persist the updated tokens
        if let Err(e) = persist_servers_token(&app_handle).await {
            log::debug!("Failed to save tokens for id: {}. Error: {:?}", &id, &e);
            return Err(format!("Failed to save tokens: {}", &e));
        }
    }

    // Remove it from the search source if it becomes unavailable
    if !server.available {
        let registry = app_handle.state::<SearchSourceRegistry>();
        registry.remove_source(id.as_str()).await;
    }

    log::debug!("Successfully logged out server with id: {}", &id);
    Ok(())
}

/// Helper function to remove the trailing slash from the server's endpoint if present.
fn trim_endpoint_last_forward_slash(server: &mut Server) {
    let endpoint = &mut server.endpoint;
    while endpoint.ends_with('/') {
        endpoint.pop();
    }
}

/// Helper function to construct the provider info URL.
fn provider_info_url(endpoint: &str) -> String {
    format!("{endpoint}/provider/_info")
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
