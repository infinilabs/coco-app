use crate::server::servers::{get_server_by_id, get_server_token};
use http::{HeaderName, HeaderValue};
use once_cell::sync::Lazy;
use reqwest::{Client, Method, RequestBuilder};
use std::collections::HashMap;
use std::time::Duration;
use tauri_plugin_store::JsonValue;
use tokio::sync::Mutex;

pub(crate) fn new_reqwest_http_client(accept_invalid_certs: bool) -> Client {
    Client::builder()
        .read_timeout(Duration::from_secs(3)) // Set a timeout of 3 second
        .connect_timeout(Duration::from_secs(3)) // Set a timeout of 3 second
        .timeout(Duration::from_secs(10)) // Set a timeout of 10 seconds
        .danger_accept_invalid_certs(accept_invalid_certs) // allow self-signed certificates
        .build()
        .expect("Failed to build client")
}

pub static HTTP_CLIENT: Lazy<Mutex<Client>> = Lazy::new(|| {
    let allow_self_signature = crate::settings::_get_allow_self_signature(
        crate::GLOBAL_TAURI_APP_HANDLE
            .get()
            .expect("global tauri app store not set")
            .clone(),
    );
    Mutex::new(new_reqwest_http_client(allow_self_signature))
});

pub struct HttpClient;

impl HttpClient {
    // Utility function for properly joining paths
    pub(crate) fn join_url(base: &str, path: &str) -> String {
        let base = base.trim_end_matches('/');
        let path = path.trim_start_matches('/');
        format!("{}/{}", base, path)
    }

    pub async fn send_raw_request(
        method: Method,
        url: &str,
        query_params: Option<HashMap<String, JsonValue>>,
        headers: Option<HashMap<String, String>>,
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        // log::debug!(
        //     "Sending Request: {}, query_params: {:?}, header: {:?}, body: {:?}",
        //     &url,
        //     &query_params,
        //     &headers,
        //     &body
        // );

        let request_builder =
            Self::get_request_builder(method, url, headers, query_params, body).await;

        let response = request_builder.send().await.map_err(|e| {
            dbg!("Failed to send request: {}", &e);
            format!("Failed to send request: {}", e)
        })?;

        // log::debug!(
        //     "Request: {}, Response status: {:?}, header: {:?}",
        //     &url,
        //     &response.status(),
        //     &response.headers()
        // );

        Ok(response)
    }

    pub async fn get_request_builder(
        method: Method,
        url: &str,
        headers: Option<HashMap<String, String>>,
        query_params: Option<HashMap<String, JsonValue>>, // Add query parameters
        body: Option<reqwest::Body>,
    ) -> RequestBuilder {
        let client = HTTP_CLIENT.lock().await; // Acquire the lock on HTTP_CLIENT

        // Build the request
        let mut request_builder = client.request(method.clone(), url);

        if let Some(h) = headers {
            let mut req_headers = reqwest::header::HeaderMap::new();
            for (key, value) in h.into_iter() {
                match (
                    HeaderName::from_bytes(key.as_bytes()),
                    HeaderValue::from_str(value.trim()),
                ) {
                    (Ok(name), Ok(val)) => {
                        req_headers.insert(name, val);
                    }
                    (Err(e), _) => {
                        eprintln!("Invalid header name: {:?}, error: {}", key, e);
                    }
                    (_, Err(e)) => {
                        eprintln!(
                            "Invalid header value for {}: {:?}, error: {}",
                            key, value, e
                        );
                    }
                }
            }
            request_builder = request_builder.headers(req_headers);
        }

        if let Some(query) = query_params {
            // Convert only supported value types into strings
            let query: HashMap<String, String> = query
                .into_iter()
                .filter_map(|(k, v)| {
                    match v {
                        JsonValue::String(s) => Some((k, s)),
                        JsonValue::Number(n) => Some((k, n.to_string())),
                        JsonValue::Bool(b) => Some((k, b.to_string())),
                        _ => {
                            dbg!(
                                "Unsupported query parameter type. Only strings, numbers, and booleans are supported.",k,v,
                            );
                            None
                        } // skip arrays, objects, nulls
                    }
                })
                .collect();
            request_builder = request_builder.query(&query);
        }

        // Add body if present
        if let Some(b) = body {
            request_builder = request_builder.body(b);
        }

        request_builder
    }

    pub async fn send_request(
        server_id: &str,
        method: Method,
        path: &str,
        custom_headers: Option<HashMap<String, String>>,
        query_params: Option<HashMap<String, JsonValue>>,
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        // Fetch the server using the server_id
        let server = get_server_by_id(server_id);
        if let Some(s) = server {
            // Construct the URL
            let url = HttpClient::join_url(&s.endpoint, path);

            // Retrieve the token for the server (token is optional)
            let token = get_server_token(server_id)
                .await?
                .map(|t| t.access_token.clone());

            let mut headers = if let Some(custom_headers) = custom_headers {
                custom_headers
            } else {
                let headers = HashMap::new();
                headers
            };

            if let Some(t) = token {
                headers.insert("X-API-TOKEN".to_string(), t);
            }

            // log::debug!(
            //     "Sending request to server: {}, url: {}, headers: {:?}",
            //     &server_id,
            //     &url,
            //     &headers
            // );

            Self::send_raw_request(method, &url, query_params, Some(headers), body).await
        } else {
            Err("Server not found".to_string())
        }
    }

    // Convenience method for GET requests (as it's the most common)
    pub async fn get(
        server_id: &str,
        path: &str,
        query_params: Option<HashMap<String, JsonValue>>, // Add query parameters
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request(server_id, Method::GET, path, None, query_params, None).await
    }

    // Convenience method for POST requests
    pub async fn post(
        server_id: &str,
        path: &str,
        query_params: Option<HashMap<String, JsonValue>>, // Add query parameters
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request(server_id, Method::POST, path, None, query_params, body).await
    }

    pub async fn advanced_post(
        server_id: &str,
        path: &str,
        custom_headers: Option<HashMap<String, String>>,
        query_params: Option<HashMap<String, JsonValue>>, // Add query parameters
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request(
            server_id,
            Method::POST,
            path,
            custom_headers,
            query_params,
            body,
        )
        .await
    }

    // Convenience method for PUT requests
    #[allow(dead_code)]
    pub async fn put(
        server_id: &str,
        path: &str,
        custom_headers: Option<HashMap<String, String>>,
        query_params: Option<HashMap<String, JsonValue>>, // Add query parameters
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request(
            server_id,
            Method::PUT,
            path,
            custom_headers,
            query_params,
            body,
        )
        .await
    }

    // Convenience method for DELETE requests
    #[allow(dead_code)]
    pub async fn delete(
        server_id: &str,
        path: &str,
        custom_headers: Option<HashMap<String, String>>,
        query_params: Option<HashMap<String, JsonValue>>, // Add query parameters
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request(
            server_id,
            Method::DELETE,
            path,
            custom_headers,
            query_params,
            None,
        )
        .await
    }
}
