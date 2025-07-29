use crate::common::server::ServerAccessToken;
use crate::server::profile::get_user_profiles;
use crate::server::servers::{
    get_server_by_id, persist_servers, persist_servers_token, save_access_token, save_server,
    try_register_server_to_search_source,
};
use tauri::AppHandle;

#[allow(dead_code)]
fn request_access_token_url(request_id: &str) -> String {
    // Remove the endpoint part and keep just the path for the request
    format!("/auth/request_access_token?request_id={}", request_id)
}

#[tauri::command]
pub async fn handle_sso_callback(
    app_handle: AppHandle,
    server_id: String,
    request_id: String,
    code: String,
) -> Result<(), String> {
    // Retrieve the server details using the server ID
    let server = get_server_by_id(&server_id).await;

    let expire_in = 3600; // TODO, need to update to actual expire_in value
    if let Some(mut server) = server {
        // Save the access token for the server
        let access_token = ServerAccessToken::new(server_id.clone(), code.clone(), expire_in);
        // dbg!(&server_id, &request_id, &code, &token);
        save_access_token(server_id.clone(), access_token).await;
        persist_servers_token(&app_handle).await?;

        // Register the server to the search source
        try_register_server_to_search_source(app_handle.clone(), &server).await;

        // Update the server's profile using the util::http::HttpClient::get method
        let profile = get_user_profiles(app_handle.clone(), server_id.clone()).await;
        dbg!(&profile);

        match profile {
            Ok(p) => {
                server.profile = Some(p);
                server.available = true;
                save_server(&server).await;
                persist_servers(&app_handle).await?;
                Ok(())
            }
            Err(e) => Err(format!("Failed to get user profile: {}", e)),
        }
    } else {
        Err(format!(
            "Server not found for ID: {}, Request ID: {}, Code: {}",
            server_id, request_id, code
        ))
    }
}
