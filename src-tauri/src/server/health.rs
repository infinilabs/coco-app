
use crate::COCO_TAURI_STORE;
use core::panic;
use futures::stream::FuturesUnordered;
use futures::FutureExt;
use futures::StreamExt;
use futures::TryFutureExt;
use ordered_float::OrderedFloat;
use reqwest::Client;
use serde::Serialize;
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
use std::collections::HashMap;
use std::sync::LazyLock;
use tauri::AppHandle;
use tauri::Runtime;
use tauri_plugin_store::StoreExt;
use crate::util::http::HTTP_CLIENT;

fn health_url(endpoint: &str) -> String {
    format!("{endpoint}/health")
}

#[tauri::command]
pub async fn get_coco_server_health_info(endpoint: String) -> bool {
    let response = match HTTP_CLIENT
        .get(health_url(&endpoint))
        .send()
        .map_err(|_request_err| ())
        .await
    {
        Ok(response) => response,
        Err(_) => return false,
    };
    let json: JsonMap<String, Json> = response.json().await.expect("invalid response");
    let status = json
        .get("status")
        .expect("response does not have a [status] field")
        .as_str()
        .expect("status field is not a string");

    status != "red"
}

#[tauri::command]
pub async fn get_coco_servers_health_info<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<HashMap<String, bool>, ()> {
    // let coco_server_endpoints = _list_coco_server_endpoints(&app_handle).await?;
    //
    // let mut futures = FuturesUnordered::new();
    // for coco_server_endpoint in coco_server_endpoints {
    //     let request_future = HTTP_CLIENT.get(health_url(&coco_server_endpoint)).send();
    //     futures.push(request_future.map(|request_result| (coco_server_endpoint, request_result)));
    // }
    //
    // let mut health_info = HashMap::new();
    //
    // while let Some((endpoint, res_response)) = futures.next().await {
    //     let healthy = match res_response {
    //         Ok(response) => {
    //             let json: JsonMap<String, Json> = response.json().await.expect("invalid response");
    //             let status = json
    //                 .get("status")
    //                 .expect("response does not have a [status] field")
    //                 .as_str()
    //                 .expect("status field is not a string");
    //             status != "red"
    //         }
    //         Err(_) => false,
    //     };
    //
    //     health_info.insert(endpoint, healthy);
    // }
    //
    // Ok(health_info)

    Ok()
}
