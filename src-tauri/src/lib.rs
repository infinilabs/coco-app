mod assistant;
mod autostart;
mod common;
mod extension;
mod search;
mod selection_monitor;
mod server;
mod settings;
mod setup;
mod shortcut;
// We need this in main.rs, so it has to be pub
pub mod util;

use crate::common::register::SearchSourceRegistry;
use crate::common::{
    CHECK_WINDOW_LABEL, MAIN_WINDOW_LABEL, SETTINGS_WINDOW_LABEL, VIEW_EXTENSION_WINDOW_LABEL,
};
use crate::server::servers::{
    load_or_insert_default_server, load_servers_token, start_bg_heartbeat_worker,
};
use crate::util::logging::set_up_tauri_logger;
use crate::util::prevent_default;
use autostart::change_autostart;
use lazy_static::lazy_static;
use std::sync::Mutex;
use std::sync::OnceLock;
use tauri::{
    AppHandle, Emitter, LogicalPosition, Manager, PhysicalPosition, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

/// Tauri store name
pub(crate) const COCO_TAURI_STORE: &str = "coco_tauri_store";

lazy_static! {
    static ref PREVIOUS_MONITOR_NAME: Mutex<Option<String>> = Mutex::new(None);
}
/// To allow us to access tauri's `AppHandle` when its context is inaccessible,
/// store it globally. It will be set in `init()`.
///
/// # WARNING
///
/// You may find this work, but the usage is discouraged and should be generally
/// avoided. If you do need it, always be careful that it may not be set() when
/// you access it.
pub(crate) static GLOBAL_TAURI_APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

// Removed unused Payload to avoid unnecessary serde derive macro invocations

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctx = tauri::generate_context!();

    let mut app_builder = tauri::Builder::default().plugin(tauri_plugin_clipboard_manager::init());
    // Set up logger first
    app_builder = app_builder.plugin(set_up_tauri_logger());

    #[cfg(desktop)]
    {
        app_builder =
            app_builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }

    app_builder = app_builder
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs_pro::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_updater::Builder::new()
                .default_version_comparator(crate::util::version::custom_version_comparator)
                .build(),
        )
        .plugin(tauri_plugin_windows_version::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_zustand::init())
        .plugin(prevent_default::init());

    // Conditional compilation for macOS
    #[cfg(target_os = "macos")]
    {
        app_builder = app_builder.plugin(tauri_nspanel::init());
    }

    let app = app_builder
        .invoke_handler(tauri::generate_handler![
            shortcut::change_shortcut,
            shortcut::unregister_shortcut,
            shortcut::get_current_shortcut,
            change_autostart,
            show_coco,
            hide_coco,
            show_settings,
            show_view_extension,
            show_check,
            hide_check,
            server::servers::add_coco_server,
            server::servers::remove_coco_server,
            server::servers::list_coco_servers,
            server::servers::logout_coco_server,
            server::servers::refresh_coco_server_info,
            server::servers::enable_server,
            server::servers::disable_server,
            server::auth::handle_sso_callback,
            server::profile::get_user_profiles,
            server::datasource::datasource_search,
            server::datasource::mcp_server_search,
            server::connector::get_connectors_by_server,
            search::query_coco_fusion,
            assistant::chat_history,
            assistant::chat_create,
            assistant::chat_chat,
            assistant::session_chat_history,
            assistant::open_session_chat,
            assistant::close_session_chat,
            assistant::cancel_session_chat,
            assistant::delete_session_chat,
            assistant::update_session_chat,
            assistant::assistant_search,
            assistant::assistant_get,
            assistant::assistant_get_multi,
            // server::get_coco_server_datasources,
            // server::get_coco_server_connectors,
            get_app_search_source,
            server::attachment::upload_attachment,
            server::attachment::get_attachment_by_ids,
            server::attachment::delete_attachment,
            server::transcription::transcription,
            server::system_settings::get_system_settings,
            extension::built_in::application::get_app_list,
            extension::built_in::application::get_app_search_path,
            extension::built_in::application::get_app_metadata,
            extension::built_in::application::add_app_search_path,
            extension::built_in::application::remove_app_search_path,
            extension::built_in::application::reindex_applications,
            extension::quicklink_link_arguments,
            extension::list_extensions,
            extension::enable_extension,
            extension::disable_extension,
            extension::set_extension_alias,
            extension::extension_on_opened,
            extension::register_extension_hotkey,
            extension::unregister_extension_hotkey,
            extension::is_extension_enabled,
            extension::third_party::install::store::search_extension,
            extension::third_party::install::store::extension_detail,
            extension::third_party::install::store::install_extension_from_store,
            extension::third_party::install::local_extension::install_local_extension,
            extension::third_party::uninstall_extension,
            extension::third_party::open_third_party_extension,
            extension::is_extension_compatible,
            extension::api::apis,
            extension::api::fs::read_dir,
            settings::set_allow_self_signature,
            settings::get_allow_self_signature,
            settings::set_local_query_source_weight,
            settings::get_local_query_source_weight,
            assistant::ask_ai,
            crate::common::document::open,
            extension::built_in::file_search::config::get_file_system_config,
            extension::built_in::file_search::config::set_file_system_config,
            server::synthesize::synthesize,
            util::file::get_file_icon,
            setup::backend_setup,
            util::app_lang::update_app_lang,
            util::path::path_absolute,
            util::logging::app_log_dir,
            selection_monitor::set_selection_enabled,
            selection_monitor::get_selection_enabled,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                log::trace!("hiding Dock icon on macOS");
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                log::trace!("Dock icon should be hidden now");
            }

            /* ----------- This code must be executed on the main thread and must not be relocated. ----------- */
            let app_handle = app.app_handle();
            let main_window = app_handle.get_webview_window(MAIN_WINDOW_LABEL).unwrap();
            let settings_window = app_handle
                .get_webview_window(SETTINGS_WINDOW_LABEL)
                .unwrap();
            let check_window = app_handle.get_webview_window(CHECK_WINDOW_LABEL).unwrap();
            setup::default(
                app_handle,
                main_window.clone(),
                settings_window.clone(),
                check_window.clone(),
            );
            /* ----------- This code must be executed on the main thread and must not be relocated. ----------- */

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                //dbg!("Close requested event received");
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .build(ctx)
        .expect("error while running tauri application");

    app.run(|app_handle, event| match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen {
            has_visible_windows,
            ..
        } => {
            // dbg!(
            //     "Reopen event received: has_visible_windows = {}",
            //     has_visible_windows
            // );
            if has_visible_windows {
                return;
            }
        }
        _ => {
            let _ = app_handle;
        }
    });
}

pub async fn init(app_handle: &AppHandle) {
    // Await the async functions to load the servers and tokens
    if let Err(err) = load_or_insert_default_server(app_handle).await {
        log::error!("Failed to load servers: {}", err);
    }

    if let Err(err) = load_servers_token(app_handle).await {
        log::error!("Failed to load server tokens: {}", err);
    }

    let coco_servers = server::servers::get_all_servers().await;

    // Get the registry from Tauri's state
    // let registry: State<SearchSourceRegistry> = app_handle.state::<SearchSourceRegistry>();

    for server in coco_servers {
        crate::server::servers::try_register_server_to_search_source(app_handle.clone(), &server)
            .await;
    }

    /*
     * Start the background heartbeat worker here after setting up Coco server
     * storage and SearchSourceRegistry.
     */
    start_bg_heartbeat_worker(app_handle.clone());

    extension::built_in::pizza_engine_runtime::start_pizza_engine_runtime().await;
}

#[tauri::command]
async fn show_coco(app_handle: AppHandle) {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        move_window_to_active_monitor(&window);

        cfg_if::cfg_if! {
            if #[cfg(target_os = "macos")] {
               use tauri_nspanel::ManagerExt;

               let app_handle_clone = app_handle.clone();

                app_handle.run_on_main_thread(move || {
                   let panel = app_handle_clone.get_webview_panel(MAIN_WINDOW_LABEL).unwrap();

                    panel.show_and_make_key();
                }).unwrap();
            } else {
                let _ = window.show();
                let _ = window.unminimize();
                // The Window Management (WM) extension (macOS-only) controls the
                // frontmost window.  Setting focus on macOS makes Coco the frontmost
                // window, which means the WM extension would control Coco instead of other
                // windows, which is not what we want.
                //
                // On Linux/Windows, however, setting focus is a necessity to ensure that
                // users open Coco's window, then they can start typing, without needing
                // to click on the window.
                let _ = window.set_focus();
            }
        };

        let _ = app_handle.emit("show-coco", ());
    }
}

#[tauri::command]
async fn hide_coco(app_handle: AppHandle) {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            use tauri_nspanel::ManagerExt;

            let app_handle_clone = app_handle.clone();
            app_handle.run_on_main_thread(move || {
                let panel = app_handle_clone.get_webview_panel(MAIN_WINDOW_LABEL).expect("cannot find the main window/panel");
                panel.hide();
            }).unwrap();
        } else {
            let window = app_handle.get_webview_window(MAIN_WINDOW_LABEL).expect("cannot find the main window");

            if let Err(err) = window.hide() {
                log::error!("Failed to hide the window: {}", err);
            } else {
                log::debug!("Window successfully hidden.");
            }
        }
    };
}

fn move_window_to_active_monitor(window: &WebviewWindow) {
    let scale_factor = window.scale_factor().unwrap();

    let point = window.cursor_position().unwrap();

    let LogicalPosition { x, y } = point.to_logical(scale_factor);

    match window.monitor_from_point(x, y) {
        Ok(Some(monitor)) => {
            if let Some(name) = monitor.name() {
                let previous_monitor_name = PREVIOUS_MONITOR_NAME.lock().unwrap();
                if let Some(ref prev_name) = *previous_monitor_name {
                    if name.to_string() == *prev_name {
                        log::debug!("Currently on the same monitor");
                        return;
                    }
                }
            }

            let monitor_position = monitor.position();
            let monitor_size = monitor.size();

            // Current window size for horizontal centering
            let window_size = match window.inner_size() {
                Ok(size) => size,
                Err(e) => {
                    log::error!("Failed to get window size: {}", e);
                    return;
                }
            };

            let window_width = window_size.width as i32;
            let window_height = 590 * scale_factor as i32;

            // Horizontal center uses actual width, vertical center uses 590 baseline
            let window_x = monitor_position.x + (monitor_size.width as i32 - window_width) / 2;
            let window_y = monitor_position.y + (monitor_size.height as i32 - window_height) / 2;

            if let Err(e) = window.set_position(PhysicalPosition::new(window_x, window_y)) {
                log::error!("Failed to move window: {}", e);
            }

            if let Some(name) = monitor.name() {
                log::debug!("Window moved to monitor: {}", name);
                let mut previous_monitor = PREVIOUS_MONITOR_NAME.lock().unwrap();
                *previous_monitor = Some(name.to_string());
            }
        }
        Ok(None) => {
            log::error!("No monitor found at the specified point");
        }
        Err(e) => {
            log::error!("Failed to get monitor from point: {}", e);
        }
    }
}

#[tauri::command]
async fn get_app_search_source(app_handle: AppHandle) -> Result<(), String> {
    let _ = server::connector::refresh_all_connectors(&app_handle).await;
    let _ = server::datasource::refresh_all_datasources(&app_handle).await;

    Ok(())
}

#[tauri::command]
async fn show_settings(app_handle: AppHandle) {
    log::debug!("settings menu item was clicked");
    let window = app_handle
        .get_webview_window(SETTINGS_WINDOW_LABEL)
        .expect("we have a settings window");

    window.show().unwrap();
    window.unminimize().unwrap();
    window.set_focus().unwrap();
}

#[tauri::command]
async fn show_view_extension(
    app_handle: AppHandle,
    label: Option<String>,
    query: Option<String>,
    width: Option<f64>,
    height: Option<f64>,
) {
    log::debug!("view extension menu item was clicked");
    if query
        .as_ref()
        .map(|q| !(q.contains("manual=1") && q.contains("ext=")))
        .unwrap_or(true)
    {
        return;
    }
    let window_label = label.unwrap_or_else(|| VIEW_EXTENSION_WINDOW_LABEL.to_string());

    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.show().unwrap();
        window.unminimize().unwrap();
        window.set_focus().unwrap();
        return;
    }

    // If window doesn't exist (e.g. was closed), create it
    let url_suffix = query.unwrap_or_else(|| "".to_string());
    let url = WebviewUrl::App(format!("/ui/view-extension{}", url_suffix).into());
    let w = width.unwrap_or(1000.0);
    let h = height.unwrap_or(800.0);

    let build_result = WebviewWindowBuilder::new(&app_handle, &window_label, url)
        .title("View Extension")
        .inner_size(w, h)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .center()
        .visible(false)
        .build();

    match build_result {
        Ok(win) => {
            let _ = win.set_focus();
        }
        Err(e) => log::error!("Failed to create view extension window: {}", e),
    }
}

#[tauri::command]
async fn show_check(app_handle: AppHandle) {
    log::debug!("check menu item was clicked");
    let window = app_handle
        .get_webview_window(CHECK_WINDOW_LABEL)
        .expect("we have a check window");

    window.show().unwrap();
    window.unminimize().unwrap();
    window.set_focus().unwrap();
}

#[tauri::command]
async fn hide_check(app_handle: AppHandle) {
    log::debug!("check window was closed");
    let window = &app_handle
        .get_webview_window(CHECK_WINDOW_LABEL)
        .expect("we have a check window");

    window.hide().unwrap();
}
