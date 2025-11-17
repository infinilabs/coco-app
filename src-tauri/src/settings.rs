use crate::COCO_TAURI_STORE;
use serde_json::Value as Json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const SETTINGS_ALLOW_SELF_SIGNATURE: &str = "settings_allow_self_signature";
const LOCAL_QUERY_SOURCE_WEIGHT: &str = "local_query_source_weight";

#[tauri::command]
pub async fn set_allow_self_signature(tauri_app_handle: AppHandle, value: bool) {
    use crate::server::http_client;

    let store = tauri_app_handle
        .store(COCO_TAURI_STORE)
        .unwrap_or_else(|e| {
            panic!(
                "store [{}] not found/loaded, error [{}]",
                COCO_TAURI_STORE, e
            )
        });

    let old_value = match store
        .get(SETTINGS_ALLOW_SELF_SIGNATURE)
        .expect("should be initialized upon first get call")
    {
        Json::Bool(b) => b,
        _ => unreachable!(
            "{} should be stored in a boolean",
            SETTINGS_ALLOW_SELF_SIGNATURE
        ),
    };

    if old_value == value {
        return;
    }

    store.set(SETTINGS_ALLOW_SELF_SIGNATURE, value);

    let mut guard = http_client::HTTP_CLIENT.lock().await;
    *guard = http_client::new_reqwest_http_client(value)
}

/// Synchronous version of `async get_allow_self_signature()`.
pub fn _get_allow_self_signature(tauri_app_handle: AppHandle) -> bool {
    let store = tauri_app_handle
        .store(COCO_TAURI_STORE)
        .unwrap_or_else(|e| {
            panic!(
                "store [{}] not found/loaded, error [{}]",
                COCO_TAURI_STORE, e
            )
        });
    if !store.has(SETTINGS_ALLOW_SELF_SIGNATURE) {
        // default to false
        store.set(SETTINGS_ALLOW_SELF_SIGNATURE, false);
    }

    match store
        .get(SETTINGS_ALLOW_SELF_SIGNATURE)
        .expect("should be Some")
    {
        Json::Bool(b) => b,
        _ => unreachable!(
            "{} should be stored in a boolean",
            SETTINGS_ALLOW_SELF_SIGNATURE
        ),
    }
}

#[tauri::command]
pub async fn get_allow_self_signature(tauri_app_handle: AppHandle) -> bool {
    _get_allow_self_signature(tauri_app_handle)
}

#[tauri::command]
pub async fn set_local_query_source_weight(tauri_app_handle: AppHandle, value: f64) {
    let store = tauri_app_handle
        .store(COCO_TAURI_STORE)
        .unwrap_or_else(|e| {
            panic!(
                "store [{}] not found/loaded, error [{}]",
                COCO_TAURI_STORE, e
            )
        });

    store.set(LOCAL_QUERY_SOURCE_WEIGHT, value);
}

#[tauri::command]
pub fn get_local_query_source_weight(tauri_app_handle: AppHandle) -> f64 {
    // default to 1.0
    const DEFAULT: f64 = 1.0;

    let store = tauri_app_handle
        .store(COCO_TAURI_STORE)
        .unwrap_or_else(|e| {
            panic!(
                "store [{}] not found/loaded, error [{}]",
                COCO_TAURI_STORE, e
            )
        });
    if !store.has(LOCAL_QUERY_SOURCE_WEIGHT) {
        store.set(LOCAL_QUERY_SOURCE_WEIGHT, DEFAULT);
    }

    match store
        .get(LOCAL_QUERY_SOURCE_WEIGHT)
        .expect("should be Some")
    {
        Json::Number(n) => n
            .as_f64()
            .unwrap_or_else(|| panic!("setting [{}] should be a f64", LOCAL_QUERY_SOURCE_WEIGHT)),
        _ => unreachable!("{} should be stored as a number", LOCAL_QUERY_SOURCE_WEIGHT),
    }
}
