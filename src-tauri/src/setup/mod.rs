use crate::GLOBAL_TAURI_APP_HANDLE;
use crate::autostart;
use crate::common::register::SearchSourceRegistry;
use crate::common::{CHECK_WINDOW_LABEL, MAIN_WINDOW_LABEL, SETTINGS_WINDOW_LABEL};
use crate::extension;
use crate::util::app_lang::update_app_lang;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager, WebviewWindow};

#[cfg(target_os = "macos")]
mod mac;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
pub use mac::*;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
pub use linux::*;

pub fn default(
    tauri_app_handle: &AppHandle,
    main_window: WebviewWindow,
    settings_window: WebviewWindow,
    check_window: WebviewWindow,
) {
    // Development mode automatically opens the console: https://tauri.app/develop/debug
    #[cfg(debug_assertions)]
    main_window.open_devtools();

    platform(
        tauri_app_handle,
        main_window.clone(),
        settings_window.clone(),
        check_window.clone(),
    );
}

/// Use this variable to track if tauri command `backend_setup()` gets called
/// by the frontend.
pub(super) static BACKEND_SETUP_FUNC_INVOKED: OnceLock<()> = OnceLock::new();

/// This function includes the setup job that has to be coordinated with the
/// frontend, or the App will panic due to races[1].  The way we coordinate is to
/// expose this function as a Tauri command, and let the frontend code invoke
/// it.
///
/// The frontend code should ensure that:
///
/// 1. This command gets called before invoking other commands.
/// 2. This command should only be called once.
///
/// [1]: For instance, Tauri command `list_extensions()` relies on an in-memory
/// extension list that won't be initialized until `init_extensions()` gets
/// called.  If the frontend code invokes `list_extensions()` before `init_extension()`
/// gets executed, we get a panic.
#[tauri::command]
#[function_name::named]
pub(crate) async fn backend_setup(tauri_app_handle: AppHandle, app_lang: String) {
    println!("backend_setup start");
    GLOBAL_TAURI_APP_HANDLE
        .set(tauri_app_handle.clone())
        .expect("global tauri AppHandle already initialized");
    log::trace!("global Tauri AppHandle set");

    let registry = SearchSourceRegistry::default();
    tauri_app_handle.manage(registry); // Store registry in Tauri's app state

    let main_window = tauri_app_handle
        .get_webview_window(MAIN_WINDOW_LABEL)
        .unwrap();
    let settings_window = tauri_app_handle
        .get_webview_window(SETTINGS_WINDOW_LABEL)
        .unwrap();
    let check_window = tauri_app_handle
        .get_webview_window(CHECK_WINDOW_LABEL)
        .unwrap();
    default(
        &tauri_app_handle,
        main_window.clone(),
        settings_window.clone(),
        check_window.clone(),
    );

    // This has to be called before initializing extensions as doing that
    // requires access to the shortcut store, which will be set by this
    // function.
    crate::shortcut::enable_shortcut(&tauri_app_handle);

    crate::init(&tauri_app_handle).await;

    // We want all the extensions here, so no filter condition specified.
    match extension::list_extensions(tauri_app_handle.clone(), None, None, false).await {
        Ok(extensions) => {
            // Initializing extension relies on SearchSourceRegistry, so this should
            // be executed after `app.manage(registry)`
            if let Err(e) = extension::init_extensions(tauri_app_handle.clone(), extensions).await {
                log::error!("initializing extensions failed with error [{}]", e);
            }
        }
        Err(e) => {
            log::error!("listing extensions failed with error [{}]", e);
        }
    }

    autostart::ensure_autostart_state_consistent(&tauri_app_handle).unwrap();

    update_app_lang(app_lang).await;

    // Invoked, now update the state
    BACKEND_SETUP_FUNC_INVOKED
        .set(())
        .unwrap_or_else(|_| panic!("tauri command {}() gets called twice!", function_name!()));

    println!("backend_setup end");
}
