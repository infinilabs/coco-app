use std::collections::HashMap;
use futures::stream::FuturesUnordered;
use tauri::{AppHandle, Runtime};
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
fn connector_url(endpoint: &str) -> String {
    format!("{endpoint}/connector/_search")
}

#[tauri::command]
pub async fn get_coco_server_connectors<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<(), ()> {
    // let coco_server_endpoints = _list_coco_server_endpoints(&app_handle).await?;
    // let tokens = get_coco_server_tokens(&app_handle);
    //
    // let mut futures = FuturesUnordered::new();
    // for coco_server_endpoint in coco_server_endpoints {
    //     if let Some(token) = get_coco_server_token(&tokens, &coco_server_endpoint) {
    //         let request_future = HTTP_CLIENT
    //             .get(connector_url(&coco_server_endpoint))
    //             .header("X-API-TOKEN", token)
    //             .send();
    //         futures
    //             .push(request_future.map(|request_result| (coco_server_endpoint, request_result)));
    //     }
    // }
    //
    // let mut profiles = HashMap::new();
    //
    // while let Some((endpoint, res_response)) = futures.next().await {
    //     match res_response {
    //         Ok(response) => {
    //             let profile: Json = response.json().await.expect("invalid response");
    //             assert!(profiles.insert(endpoint, profile).is_none());
    //         }
    //         Err(_) => { /* do nothing */ }
    //     };
    // }
    //
    // Ok(profiles)
    Ok(())
}
