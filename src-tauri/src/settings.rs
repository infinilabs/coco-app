use crate::COCO_TAURI_STORE;
use serde_json::Value as Json;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

const SETTINGS_ALLOW_SELF_SIGNATURE: &str = "settings_allow_self_signature";

#[tauri::command]
pub async fn set_allow_self_signature<R: Runtime>(tauri_app_handle: AppHandle<R>, value: bool) {
    let store = tauri_app_handle
        .store(COCO_TAURI_STORE)
        .unwrap_or_else(|e| {
            panic!(
                "store [{}] not found/loaded, error [{}]",
                COCO_TAURI_STORE, e
            )
        });

    store.set(SETTINGS_ALLOW_SELF_SIGNATURE, value);
}

#[tauri::command]
pub async fn get_allow_self_signature<R: Runtime>(tauri_app_handle: AppHandle<R>) -> bool {
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
