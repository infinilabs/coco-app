use std::time::Duration;
use lazy_static::lazy_static;
use tauri::AppHandle;
use crate::server::servers::{get_server_by_id, get_server_token};

use once_cell::sync::Lazy;
use tokio::sync::Mutex;
use reqwest::{Client, Method, StatusCode};

pub static HTTP_CLIENT: Lazy<Mutex<Client>> = Lazy::new(|| {
    let client = Client::builder()
        .read_timeout(Duration::from_secs(3)) // Set a timeout of 3 second
        .connect_timeout(Duration::from_secs(3)) // Set a timeout of 3 second
        .timeout(Duration::from_secs(10))  // Set a timeout of 10 seconds
        .danger_accept_invalid_certs(true) // example for self-signed certificates
        .build()
        .expect("Failed to build client");
    Mutex::new(client)
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
        headers: Option<reqwest::header::HeaderMap>,
        body: Option<reqwest::Body>,
    ) -> Result<reqwest::Response, String> {
        let client = HTTP_CLIENT.lock().await; // Acquire the lock on HTTP_CLIENT

        // Build the request
        let mut request_builder = client.request(method.clone(), url);

        // Add headers if present
        if let Some(h) = headers {
            request_builder = request_builder.headers(h);
        }

        // Add body if present
        if let Some(b) = body {
            request_builder = request_builder.body(b);
        }

        // dbg!("Sending request to: {}", url);

        // Send the request
        let response = match request_builder.send().await {
            Ok(resp) => resp,
            Err(e) => {
                dbg!("Failed to send request: {}", &e);
                return Err(format!("Failed to send request: {}", e));
            }
        };

        // dbg!("Response status: {:?}", response.status());
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

            // dbg!(&url);
            // dbg!(&server_id);

            // Retrieve the token for the server (token is optional)
            let token = get_server_token(server_id).map(|t| t.access_token.clone());


            // Create headers map (optional "X-API-TOKEN" header)
            let mut headers = reqwest::header::HeaderMap::new();
            if let Some(t) = token {
                headers.insert("X-API-TOKEN", reqwest::header::HeaderValue::from_str(&t).unwrap());
            }

            // dbg!(&headers);


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