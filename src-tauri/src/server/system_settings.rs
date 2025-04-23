use crate::server::http_client::HttpClient;
use serde_json::Value;
use tauri::command;

#[command]
pub async fn get_system_settings(server_id: String) -> Result<Value, String> {
    let response = HttpClient::get(&server_id, "/settings", None)
        .await
        .map_err(|err| err.to_string())?;

    response
        .json::<Value>()
        .await
        .map_err(|err| err.to_string())
}
