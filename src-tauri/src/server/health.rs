use crate::server::http_client::HttpClient;
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
use tauri::AppHandle;
use tauri::Runtime;

#[tauri::command]
pub async fn get_server_health<R: Runtime>(
    _app_handle: AppHandle<R>,
    server_id: String,
) -> bool {
    // Try to fetch the profile using the generic GET method
    let response = match HttpClient::get(&server_id, "/health").await {
        Ok(res) => res,
        Err(_) => return false, // If an error occurs, return false
    };

    // Check if the status code is in the valid range
    let status_code = response.status().as_u16();
    if status_code < 200 || status_code >= 400 {
        return false; // If the status code is not in the success range, return false
    }

    // Try to parse the JSON response
    let json: Result<JsonMap<String, Json>, _> = response.json().await;
    let json = match json {
        Ok(val) => val,
        Err(_) => return false, // If JSON parsing fails, return false
    };

    // Try to get the "status" field and check if it's a string
    let status = match json.get("status") {
        Some(val) => match val.as_str() {
            Some(s) => s,
            None => return false, // If "status" is not a string, return false
        },
        None => return false, // If "status" is missing, return false
    };

    // Return false if the status is "red", otherwise return true
    status != "red"
}
