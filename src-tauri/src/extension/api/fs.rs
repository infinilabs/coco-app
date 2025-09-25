//! File system APIs

use tokio::fs::read_dir as tokio_read_dir;

#[tauri::command]
pub(crate) async fn read_dir(path: String) -> Result<Vec<String>, String> {
    let mut iter = tokio_read_dir(path).await.map_err(|e| e.to_string())?;

    let mut file_names = Vec::new();

    loop {
        let opt_entry = iter.next_entry().await.map_err(|e| e.to_string())?;
        let Some(entry) = opt_entry else {
            break;
        };

        let file_name = entry.file_name().to_string_lossy().into_owned();
        file_names.push(file_name);
    }

    Ok(file_names)
}
