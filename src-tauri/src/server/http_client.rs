use lazy_static::lazy_static;
use tauri::AppHandle;
use crate::server::servers::{get_server_by_id, get_server_token};

use once_cell::sync::Lazy;
use tokio::sync::Mutex;
use reqwest::{Client, Method, StatusCode};

pub static HTTP_CLIENT: Lazy<Mutex<Client>> = Lazy::new(|| Mutex::new(Client::new()));


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
        headers: Option<reqwest::header::HeaderMap>,
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        // Lock the client for usage (it’s a cached instance)
        let client = HTTP_CLIENT.lock().await; // Use async lock here

        // Build the request based on the HTTP method
        let mut request_builder = client.request(method, url);

        // Add headers if provided
        if let Some(h) = headers {
            request_builder = request_builder.headers(h);
        }

        // Add the body if it exists
        if let Some(b) = body {
            request_builder = request_builder.body(b);
        }

        dbg!(&request_builder);

        // Send the request
        let response = request_builder
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        // Now return the original response
        Ok(response)
    }

    pub async fn send_request(
        server_id: &str,
        method: Method,
        path: &str,
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        // Fetch the server using the server_id
        let server = get_server_by_id(server_id);
        if let Some(s) = server {
            // Construct the URL
            let url = HttpClient::join_url(&s.endpoint, path);

            dbg!(&url);
            dbg!(&server_id);

            // Retrieve the token for the server (token is optional)
            let token = get_server_token(server_id).map(|t| t.access_token.clone());


            // Create headers map (optional "X-API-TOKEN" header)
            let mut headers = reqwest::header::HeaderMap::new();
            if let Some(t) = token {
                headers.insert("X-API-TOKEN", reqwest::header::HeaderValue::from_str(&t).unwrap());
            }

            dbg!(&headers);


            // Send the raw request using the send_raw_request function
            Self::send_raw_request(method, &url, Some(headers), body).await
        } else {
            Err("Server not found".to_string())
        }
    }

    // Convenience method for GET requests (as it's the most common)
    pub async fn get(
        server_id: &str,
        path: &str,
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request(server_id, Method::GET, path, None).await
    }

    // Convenience method for POST requests
    pub async fn post(
        server_id: &str,
        path: &str,
        body: reqwest::Body,
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request( server_id, Method::POST, path, Some(body)).await
    }

    // Convenience method for PUT requests
    pub async fn put(
        server_id: &str,
        path: &str,
        body: reqwest::Body,
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request( server_id, Method::PUT, path, Some(body)).await
    }

    // Convenience method for DELETE requests
    pub async fn delete(
        server_id: &str,
        path: &str,
    ) -> Result<reqwest::Response, String> {
        HttpClient::send_request(server_id, Method::DELETE, path, None).await
    }
}