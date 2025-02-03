use crate::common::datasource::DataSource;
use crate::common::search_response::parse_search_results;
use crate::server::http_client::HttpClient;
use tauri::{AppHandle, Runtime};

fn datasource_url(endpoint: &str) -> String {
    format!("{endpoint}/datasource/_search")
}

#[tauri::command]
pub async fn get_datasources_by_server<R: Runtime>(
    app_handle: AppHandle<R>,
    id: String,
) -> Result<Vec<DataSource>, String> {
    dbg!("get_datasources_by_server: id =", &id);

    // Use the generic GET method from HttpClient
    let resp = HttpClient::get(&id, "/datasource/_search")
        .await
        .map_err(|e| {
            dbg!("Error fetching datasource: {}", &e);
            format!("Error fetching datasource: {}", e)
        })?;

    // Log the raw response status and headers
    dbg!("Response status: {:?}", resp.status());
    dbg!("Response headers: {:?}", resp.headers());

    // Parse the search results directly from the response body
    let datasources: Vec<DataSource> = parse_search_results(resp).await.map_err(|e| {
        dbg!("Error parsing search results: {}", &e);
        e.to_string()
    })?;

    dbg!("Parsed datasources: {:?}", &datasources);

    return Ok(datasources);
}
