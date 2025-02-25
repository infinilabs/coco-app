use crate::common::profile::UserProfile;
use crate::server::http_client::HttpClient;
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub async fn get_user_profiles<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
) -> Result<UserProfile, String> {
    // Use the generic GET method from HttpClient
    let response = HttpClient::get(&server_id, "/account/profile", None)
        .await
        .map_err(|e| format!("Error fetching profile: {}", e))?;

    if let Some(content_length) = response.content_length() {
        if content_length > 0 {
            let profile: UserProfile = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))?;
            return Ok(profile);
        }
    }

    Err("Profile not found or empty response".to_string())
}
