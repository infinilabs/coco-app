use crate::COCO_TAURI_STORE;
use tauri::App;
use tauri::AppHandle;
use tauri::Manager;
use tauri::Runtime;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_global_shortcut::Shortcut;
use tauri_plugin_global_shortcut::ShortcutState;
use tauri_plugin_store::JsonValue;
use tauri_plugin_store::StoreExt;

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
pub fn enable_shortcut(app: &App) {
    let store = app
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
        _register_shortcut_upon_start(app, stored_shortcut);
    } else {
        store.set(
            COCO_GLOBAL_SHORTCUT,
            JsonValue::String(DEFAULT_SHORTCUT.to_string()),
        );
        let default_shortcut = DEFAULT_SHORTCUT
            .parse::<Shortcut>()
            .expect("default shortcut should never be invalid");
        _register_shortcut_upon_start(app, default_shortcut);
    }
}

/// Get the stored shortcut as a string, same as [`_get_shortcut()`], except that
/// this is a `tauri::command` interface.
#[tauri::command]
pub fn get_current_shortcut<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let shortcut = _get_shortcut(&app);
    Ok(shortcut)
}

/// Get the current shortcut and unregister it on the tauri side.
#[tauri::command]
pub fn unregister_shortcut<R: Runtime>(app: AppHandle<R>) {
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
pub fn change_shortcut<R: Runtime>(
    app: AppHandle<R>,
    _window: tauri::Window<R>,
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
fn _register_shortcut<R: Runtime>(app: &AppHandle<R>, shortcut: Shortcut) {
    let main_window = app.get_webview_window("main").unwrap();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, scut, event| {
            if scut == &shortcut {
                if let ShortcutState::Pressed = event.state() {
                    if main_window.is_visible().unwrap() {
                        main_window.hide().unwrap();
                    } else {
                        main_window.show().unwrap();
                        main_window.set_focus().unwrap();
                    }
                }
            }
        })
        .map_err(|err| format!("Failed to register new shortcut key '{}'", err))
        .unwrap();
}

/// Helper function to register a shortcut, used to set up the shortcut up App's first start.
fn _register_shortcut_upon_start(app: &App, shortcut: Shortcut) {
    let window = app.get_webview_window("main").unwrap();
    app.handle()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |_app, scut, event| {
                    if scut == &shortcut {
                        if let ShortcutState::Pressed = event.state() {
                            if window.is_visible().unwrap() {
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    }
                })
                .build(),
        )
        .unwrap();
    app.global_shortcut().register(shortcut).unwrap();
}

/// Helper function to get the stored global shortcut, as a string.
pub fn _get_shortcut<R: Runtime>(app: &AppHandle<R>) -> String {
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
