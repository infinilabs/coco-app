use crate::common::http::get_response_body_text;
use crate::common::profile::UserProfile;
use crate::server::http_client::HttpClient;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_user_profiles(
    _app_handle: AppHandle,
    server_id: String,
) -> Result<UserProfile, String> {
    // Use the generic GET method from HttpClient
    let response = HttpClient::get(&server_id, "/account/profile", None)
        .await
        .map_err(|e| format!("Error fetching profile: {}", e))?;

    // Use get_response_body_text to extract the body content
    let response_body = get_response_body_text(response)
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // Check if the response body is not empty before deserializing
    if !response_body.is_empty() {
        let profile: UserProfile = serde_json::from_str(&response_body)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        return Ok(profile);
    }

    Err("Profile not found or empty response".to_string())
}
