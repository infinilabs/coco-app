use crate::GLOBAL_TAURI_APP_HANDLE;
use crate::autostart;
use crate::common::register::SearchSourceRegistry;
use crate::util::app_lang::update_app_lang;
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering;
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

/// Indicates if the setup job is completed.
static BACKEND_SETUP_COMPLETED: AtomicBool = AtomicBool::new(false);
/// The function `backup_setup()` may be called concurrently, use this lock to
/// synchronize that only 1 async task can do the actual setup job.
static MUTEX_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

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
pub(crate) async fn backend_setup(tauri_app_handle: AppHandle, app_lang: String) {
    if BACKEND_SETUP_COMPLETED.load(Ordering::Relaxed) {
        return;
    }

    // Race to let one async task do the setup job
    let _guard = MUTEX_LOCK.lock().await;

    // Re-check in case the current async task is not the first one that acquires
    // the lock
    if BACKEND_SETUP_COMPLETED.load(Ordering::Relaxed) {
        return;
    }

    GLOBAL_TAURI_APP_HANDLE
        .set(tauri_app_handle.clone())
        .expect("global tauri AppHandle already initialized");
    log::trace!("global Tauri AppHandle set");

    /*
     * This should be set before Rust code makes any HTTP requests as it is
     * needed to provider HTTP header: X-APP-LANG
     */
    update_app_lang(app_lang).await;

    let registry = SearchSourceRegistry::default();
    tauri_app_handle.manage(registry); // Store registry in Tauri's app state

    // This has to be called before initializing extensions as doing that
    // requires access to the shortcut store, which will be set by this
    // function.
    //
    //
    // Windows requires that hotkey setup has to be done on the main thread, or
    // we will get error "ERROR_WINDOW_OF_OTHER_THREAD 1408 (0x580)"
    let tauri_app_handle_clone = tauri_app_handle.clone();
    tauri_app_handle
        .run_on_main_thread(move || {
            crate::shortcut::enable_shortcut(&tauri_app_handle_clone);
        })
        .expect("failed to run this closure on the main thread");

    // Start system-wide selection monitor (macOS-only currently)
    #[cfg(target_os = "macos")]
    {
        crate::selection_monitor::start_selection_monitor(tauri_app_handle.clone());
    }

    crate::init(&tauri_app_handle).await;

    if let Err(err) = crate::extension::init_extensions(&tauri_app_handle).await {
        log::error!(
            "failed to initialize extension-related stuff, error [{}]",
            err
        );
    }

    autostart::ensure_autostart_state_consistent(&tauri_app_handle).unwrap();

    // Invoked, now update the state
    BACKEND_SETUP_COMPLETED.store(true, Ordering::Relaxed);
}
