use crate::common::auth::RequestAccessTokenResponse;
use crate::common::register::SearchSourceRegistry;
use crate::common::server::ServerAccessToken;
use crate::server::http_client::HttpClient;
use crate::server::profile::get_user_profiles;
use crate::server::search::CocoSearchSource;
use crate::server::servers::{get_server_by_id, persist_servers, persist_servers_token, save_access_token, save_server};
use reqwest::{Client, StatusCode};
use tauri::{AppHandle, Manager, Runtime};
fn request_access_token_url(request_id: &str, code: &str) -> String {
    // Remove the endpoint part and keep just the path for the request
    format!("/auth/request_access_token?request_id={}&token={}", request_id, code)
}

#[tauri::command]
pub async fn handle_sso_callback<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String,
    request_id: String,
    code: String,
) -> Result<(), String> {
    // Retrieve the server details using the server ID
    let server = get_server_by_id(&server_id);

    if let Some(mut server) = server {
        // Prepare the URL for requesting the access token (endpoint is base URL, path is relative)
        // save_access_token(server_id.clone(), ServerAccessToken::new(server_id.clone(), code.clone(), 60 * 15));
        let path = request_access_token_url(&request_id, &code);

        // Send the request for the access token using the util::http::HttpClient::get method
        let response = HttpClient::get(&server_id, &path, None)
            .await
            .map_err(|e| format!("Failed to send request to the server: {}", e))?;

        if response.status() == StatusCode::OK {
            // Check if the response has a valid content length
            if let Some(content_length) = response.content_length() {
                if content_length > 0 {
                    // Deserialize the response body to get the access token
                    let token_result: Result<RequestAccessTokenResponse, _> = response.json().await;

                    match token_result {
                        Ok(token) => {
                            // Save the access token for the server
                            let access_token = ServerAccessToken::new(
                                server_id.clone(),
                                token.access_token.clone(),
                                token.expire_at,
                            );
                            // dbg!(&server_id, &request_id, &code, &token);
                            save_access_token(server_id.clone(), access_token);
                            persist_servers_token(&app_handle)?;

                            let registry = app_handle.state::<SearchSourceRegistry>();
                            let source = CocoSearchSource::new(server.clone(), Client::new());
                            registry.register_source(source).await;

                            // Update the server's profile using the util::http::HttpClient::get method
                            let profile = get_user_profiles(app_handle.clone(), server_id.clone()).await;
                            dbg!(&profile);

                            match profile {
                                Ok(p) => {
                                    server.profile = Some(p);
                                    server.available = true;
                                    save_server(&server);
                                    persist_servers(&app_handle).await?;
                                    Ok(())
                                }
                                Err(e) => Err(format!("Failed to get user profile: {}", e)),
                            }
                        }
                        Err(e) => Err(format!("Failed to deserialize the token response: {}", e)),
                    }
                } else {
                    Err("Received empty response body.".to_string())
                }
            } else {
                Err("Could not determine the content length.".to_string())
            }
        } else {
            Err(format!(
                "Request failed with status: {}, URL: {}, Code: {}, Response: {:?}",
                response.status(),
                path,
                code,
                response
            ))
        }
    } else {
        Err(format!(
            "Server not found for ID: {}, Request ID: {}, Code: {}",
            server_id, request_id, code
        ))
    }
}