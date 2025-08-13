use crate::common::MAIN_WINDOW_LABEL;
use crate::{COCO_TAURI_STORE, hide_coco, show_coco};
use tauri::{AppHandle, Manager, async_runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_store::{JsonValue, StoreExt};

/// Tauri's store is a key-value database, we use it to store our registered
/// global shortcut.
///
/// This is the key we use to store it.
const COCO_GLOBAL_SHORTCUT: &str = "coco_global_shortcut";

#[cfg(target_os = "macos")]
const DEFAULT_SHORTCUT: &str = "command+shift+space";

#[cfg(any(target_os = "windows", target_os = "linux"))]
const DEFAULT_SHORTCUT: &str = "ctrl+shift+space";

/// Set up the shortcut upon app start.
pub fn enable_shortcut(tauri_app_handle: &AppHandle) {
    log::trace!("setting up Coco hotkey");
    let store = tauri_app_handle
        .store(COCO_TAURI_STORE)
        .expect("creating a store should not fail");

    if let Some(stored_shortcut) = store.get(COCO_GLOBAL_SHORTCUT) {
        let stored_shortcut_str = match stored_shortcut {
            JsonValue::String(str) => str,
            unexpected_type => panic!(
                "COCO shortcut should be stored as a string, found: {} ",
                unexpected_type
            ),
        };
        let stored_shortcut = stored_shortcut_str
            .parse::<Shortcut>()
            .expect("stored shortcut string should be valid");
        _register_shortcut_upon_start(tauri_app_handle, stored_shortcut);
    } else {
        store.set(
            COCO_GLOBAL_SHORTCUT,
            JsonValue::String(DEFAULT_SHORTCUT.to_string()),
        );
        let default_shortcut = DEFAULT_SHORTCUT
            .parse::<Shortcut>()
            .expect("default shortcut should never be invalid");
        _register_shortcut_upon_start(tauri_app_handle, default_shortcut);
    }
    log::trace!("Coco hotkey has been set");
}

/// Get the stored shortcut as a string, same as [`_get_shortcut()`], except that
/// this is a `tauri::command` interface.
#[tauri::command]
pub async fn get_current_shortcut(app: AppHandle) -> Result<String, String> {
    let shortcut = _get_shortcut(&app);
    Ok(shortcut)
}

/// Get the current shortcut and unregister it on the tauri side.
#[tauri::command]
pub async fn unregister_shortcut(app: AppHandle) {
    let shortcut_str = _get_shortcut(&app);
    let shortcut = shortcut_str
        .parse::<Shortcut>()
        .expect("stored shortcut string should be valid");

    app.global_shortcut()
        .unregister(shortcut)
        .expect("failed to unregister shortcut")
}

/// Change the global shortcut to `key`.
#[tauri::command]
pub async fn change_shortcut(
    app: AppHandle,
    _window: tauri::Window,
    key: String,
) -> Result<(), String> {
    println!("key {}:", key);
    let shortcut = match key.parse::<Shortcut>() {
        Ok(shortcut) => shortcut,
        Err(_) => return Err(format!("invalid shortcut {}", key)),
    };

    // Store it
    let store = app
        .get_store(COCO_TAURI_STORE)
        .expect("store should be loaded or created");
    store.set(COCO_GLOBAL_SHORTCUT, JsonValue::String(key));

    // Register it
    _register_shortcut(&app, shortcut);

    Ok(())
}

/// Helper function to register a shortcut, used for shortcut updates.
fn _register_shortcut(app: &AppHandle, shortcut: Shortcut) {
    app.global_shortcut()
        .on_shortcut(shortcut, move |app, scut, event| {
            if scut == &shortcut {
                dbg!("shortcut pressed");
                let main_window = app.get_webview_window(MAIN_WINDOW_LABEL).unwrap();
                if let ShortcutState::Pressed = event.state() {
                    let app_handle = app.clone();
                    if main_window.is_visible().unwrap() {
                        async_runtime::spawn(async move {
                            hide_coco(app_handle).await;
                        });
                    } else {
                        async_runtime::spawn(async move {
                            show_coco(app_handle).await;
                        });
                    }
                }
            }
        })
        .map_err(|err| format!("Failed to register new shortcut key '{}'", err))
        .unwrap();
}

/// Helper function to register a shortcut, used to set up the shortcut up App's first start.
fn _register_shortcut_upon_start(tauri_app_handle: &AppHandle, shortcut: Shortcut) {
    tauri_app_handle
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, scut, event| {
                    if scut == &shortcut {
                        let window = app.get_webview_window(MAIN_WINDOW_LABEL).unwrap();
                        if let ShortcutState::Pressed = event.state() {
                            let app_handle = app.clone();

                            if window.is_visible().unwrap() {
                                async_runtime::spawn(async move {
                                    hide_coco(app_handle).await;
                                });
                            } else {
                                async_runtime::spawn(async move {
                                    show_coco(app_handle).await;
                                });
                            }
                        }
                    }
                })
                .build(),
        )
        .unwrap();
    tauri_app_handle
        .global_shortcut()
        .register(shortcut)
        .unwrap();
}

/// Helper function to get the stored global shortcut, as a string.
pub fn _get_shortcut(app: &AppHandle) -> String {
    let store = app
        .get_store(COCO_TAURI_STORE)
        .expect("store should be loaded or created");

    match store
        .get(COCO_GLOBAL_SHORTCUT)
        .expect("shortcut should be stored")
    {
        JsonValue::String(str) => str,
        unexpected_type => panic!(
            "COCO shortcut should be stored as a string, found: {} ",
            unexpected_type
        ),
    }
}
