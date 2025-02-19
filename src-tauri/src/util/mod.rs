#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    match tauri_plugin_opener::open_url(&url, None::<&str>) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open URL: {}", e)),
    }
}