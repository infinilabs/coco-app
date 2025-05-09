mod assistant;
mod autostart;
mod common;
mod local;
mod search;
mod server;
mod setup;
mod shortcut;
mod util;

use crate::common::register::SearchSourceRegistry;
// use crate::common::traits::SearchSource;
use crate::common::{MAIN_WINDOW_LABEL, SETTINGS_WINDOW_LABEL};
use crate::server::servers::{load_or_insert_default_server, load_servers_token};
use autostart::{change_autostart, enable_autostart};
use lazy_static::lazy_static;
use std::sync::Mutex;
use std::sync::OnceLock;
use tauri::async_runtime::block_on;
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Runtime, WebviewWindow, Window, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

/// Tauri store name
pub(crate) const COCO_TAURI_STORE: &str = "coco_tauri_store";

lazy_static! {
    static ref PREVIOUS_MONITOR_NAME: Mutex<Option<String>> = Mutex::new(None);
}

/// To allow us to access tauri's `AppHandle` when its context is inaccessible,
/// store it globally. It will be set in `init()`.
pub(crate) static GLOBAL_TAURI_APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

#[tauri::command]
async fn change_window_height(handle: AppHandle, height: u32) {
    let window: WebviewWindow = handle.get_webview_window(MAIN_WINDOW_LABEL).unwrap();

    let mut size = window.outer_size().unwrap();
    size.height = height;
    window.set_size(size).unwrap();
}

#[derive(serde::Deserialize)]
struct ThemeChangedPayload {
    #[allow(dead_code)]
    is_dark_mode: bool,
}

#[derive(Clone, serde::Serialize)]
#[allow(dead_code)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctx = tauri::generate_context!();
    // Initialize logger
    env_logger::init();

    let mut app_builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
            // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    app_builder = app_builder
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            None,
        ))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs_pro::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_windows_version::init());

    // Conditional compilation for macOS
    #[cfg(target_os = "macos")]
    {
        app_builder = app_builder.plugin(tauri_nspanel::init());
    }

    let app = app_builder
        .invoke_handler(tauri::generate_handler![
            change_window_height,
            shortcut::change_shortcut,
            shortcut::unregister_shortcut,
            shortcut::get_current_shortcut,
            change_autostart,
            show_coco,
            hide_coco,
            show_settings,
            server::servers::get_server_token,
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
            assistant::new_chat,
            assistant::send_message,
            assistant::session_chat_history,
            assistant::open_session_chat,
            assistant::close_session_chat,
            assistant::cancel_session_chat,
            assistant::delete_session_chat,
            assistant::update_session_chat,
            assistant::assistant_search,
            // server::get_coco_server_datasources,
            // server::get_coco_server_connectors,
            server::websocket::connect_to_server,
            server::websocket::disconnect,
            get_app_search_source,
            server::attachment::upload_attachment,
            server::attachment::get_attachment,
            server::attachment::delete_attachment,
            server::transcription::transcription,
            util::open,
            server::system_settings::get_system_settings,
            simulate_mouse_click,
            local::get_disabled_local_query_sources,
            local::enable_local_query_source,
            local::disable_local_query_source,
            local::application::get_app_list,
            local::application::get_app_search_path,
            local::application::get_app_metadata,
            local::application::set_app_alias,
            local::application::register_app_hotkey,
            local::application::unregister_app_hotkey,
            local::application::disable_app_search,
            local::application::enable_app_search,
            local::application::add_app_search_path,
            local::application::remove_app_search_path,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            GLOBAL_TAURI_APP_HANDLE
                .set(app_handle.clone())
                .expect("variable already initialized");

            let registry = SearchSourceRegistry::default();

            app.manage(registry); // Store registry in Tauri's app state
            app.manage(server::websocket::WebSocketManager::default());

            block_on(async {
                init(app.handle()).await;
            });

            shortcut::enable_shortcut(app);

            enable_autostart(app);

            #[cfg(target_os = "macos")]
            app.set_activation_policy(ActivationPolicy::Accessory);

            // app.listen("theme-changed", move |event| {
            //     if let Ok(payload) = serde_json::from_str::<ThemeChangedPayload>(event.payload()) {
            //         // switch_tray_icon(app.app_handle(), payload.is_dark_mode);
            //         println!("Theme changed: is_dark_mode = {}", payload.is_dark_mode);
            //     }
            // });

            #[cfg(desktop)]
            {
                #[cfg(any(windows, target_os = "linux"))]
                {
                    app.deep_link().register("coco")?;
                    use tauri_plugin_deep_link::DeepLinkExt;
                    app.deep_link().register_all()?;
                }
            }

            // app.deep_link().on_open_url(|event| {
            //     dbg!(event.urls());
            // });

            let main_window = app.get_webview_window(MAIN_WINDOW_LABEL).unwrap();
            let settings_window = app.get_webview_window(SETTINGS_WINDOW_LABEL).unwrap();
            setup::default(app, main_window.clone(), settings_window.clone());

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                dbg!("Close requested event received");
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
            dbg!(
                "Reopen event received: has_visible_windows = {}",
                has_visible_windows
            );
            if has_visible_windows {
                return;
            }
        }
        _ => {
            let _ = app_handle;
        }
    });
}

pub async fn init<R: Runtime>(app_handle: &AppHandle<R>) {
    // Await the async functions to load the servers and tokens
    if let Err(err) = load_or_insert_default_server(app_handle).await {
        eprintln!("Failed to load servers: {}", err);
    }

    if let Err(err) = load_servers_token(app_handle).await {
        eprintln!("Failed to load server tokens: {}", err);
    }

    let coco_servers = server::servers::get_all_servers();

    // Get the registry from Tauri's state
    // let registry: State<SearchSourceRegistry> = app_handle.state::<SearchSourceRegistry>();

    for server in coco_servers {
        crate::server::servers::try_register_server_to_search_source(app_handle.clone(), &server)
            .await;
    }

    local::start_pizza_engine_runtime();
}

#[tauri::command]
async fn show_coco<R: Runtime>(app_handle: AppHandle<R>) {
    if let Some(window) = app_handle.get_window(MAIN_WINDOW_LABEL) {
        move_window_to_active_monitor(&window);

        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        let _ = app_handle.emit("show-coco", ());
    }
}

#[tauri::command]
async fn hide_coco<R: Runtime>(app: AppHandle<R>) {
    if let Some(window) = app.get_window(MAIN_WINDOW_LABEL) {
        if let Err(err) = window.hide() {
            eprintln!("Failed to hide the window: {}", err);
        } else {
            println!("Window successfully hidden.");
        }
    } else {
        eprintln!("Main window not found.");
    }
}

fn move_window_to_active_monitor<R: Runtime>(window: &Window<R>) {
    dbg!("Moving window to active monitor");
    // Try to get the available monitors, handle failure gracefully
    let available_monitors = match window.available_monitors() {
        Ok(monitors) => monitors,
        Err(e) => {
            eprintln!("Failed to get monitors: {}", e);
            return;
        }
    };

    // Attempt to get the cursor position, handle failure gracefully
    let cursor_position = match window.cursor_position() {
        Ok(pos) => Some(pos),
        Err(e) => {
            eprintln!("Failed to get cursor position: {}", e);
            None
        }
    };

    // Find the monitor that contains the cursor or default to the primary monitor
    let target_monitor = if let Some(cursor_position) = cursor_position {
        // Convert cursor position to integers
        let cursor_x = cursor_position.x.round() as i32;
        let cursor_y = cursor_position.y.round() as i32;

        // Find the monitor that contains the cursor
        available_monitors.into_iter().find(|monitor| {
            let monitor_position = monitor.position();
            let monitor_size = monitor.size();

            cursor_x >= monitor_position.x
                && cursor_x <= monitor_position.x + monitor_size.width as i32
                && cursor_y >= monitor_position.y
                && cursor_y <= monitor_position.y + monitor_size.height as i32
        })
    } else {
        None
    };

    // Use the target monitor or default to the primary monitor
    let monitor = match target_monitor.or_else(|| window.primary_monitor().ok().flatten()) {
        Some(monitor) => monitor,
        None => {
            eprintln!("No monitor found!");
            return;
        }
    };

    if let Some(name) = monitor.name() {
        let previous_monitor_name = PREVIOUS_MONITOR_NAME.lock().unwrap();

        if let Some(ref prev_name) = *previous_monitor_name {
            if name.to_string() == *prev_name {
                println!("Currently on the same monitor");

                return;
            }
        }
    }

    let monitor_position = monitor.position();
    let monitor_size = monitor.size();

    // Get the current size of the window
    let window_size = match window.inner_size() {
        Ok(size) => size,
        Err(e) => {
            eprintln!("Failed to get window size: {}", e);
            return;
        }
    };

    let window_width = window_size.width as i32;
    let window_height = window_size.height as i32;

    // Calculate the new position to center the window on the monitor
    let window_x = monitor_position.x + (monitor_size.width as i32 - window_width) / 2;
    let window_y = monitor_position.y + (monitor_size.height as i32 - window_height) / 2;

    // Move the window to the new position
    if let Err(e) = window.set_position(PhysicalPosition::new(window_x, window_y)) {
        eprintln!("Failed to move window: {}", e);
    }

    if let Some(name) = monitor.name() {
        println!("Window moved to monitor: {}", name);

        let mut previous_monitor = PREVIOUS_MONITOR_NAME.lock().unwrap();
        *previous_monitor = Some(name.to_string());
    }
}

#[allow(dead_code)]
fn open_settings(app: &tauri::AppHandle) {
    use tauri::webview::WebviewBuilder;
    println!("settings menu item was clicked");
    let window = app.get_webview_window("settings");
    if let Some(window) = window {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    } else {
        let window = tauri::window::WindowBuilder::new(app, "settings")
            .title("Settings Window")
            .fullscreen(false)
            .resizable(false)
            .minimizable(false)
            .maximizable(false)
            .inner_size(800.0, 600.0)
            .build()
            .unwrap();

        let webview_builder =
            WebviewBuilder::new("settings", tauri::WebviewUrl::App("/ui/settings".into()));
        let _webview = window
            .add_child(
                webview_builder,
                tauri::LogicalPosition::new(0, 0),
                window.inner_size().unwrap(),
            )
            .unwrap();
    }
}

#[tauri::command]
async fn get_app_search_source<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
    local::init_local_search_source(&app_handle).await?;
    let _ = server::connector::refresh_all_connectors(&app_handle).await;
    let _ = server::datasource::refresh_all_datasources(&app_handle).await;

    Ok(())
}

#[tauri::command]
async fn show_settings(app_handle: AppHandle) {
    open_settings(&app_handle);
}

#[tauri::command]
async fn simulate_mouse_click<R: Runtime>(window: WebviewWindow<R>, is_chat_mode: bool) {
    #[cfg(target_os = "windows")]
    {
        use enigo::{Button, Coordinate, Direction, Enigo, Mouse, Settings};
        use std::{thread, time::Duration};

        if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
            // Save the current mouse position
            if let Ok((original_x, original_y)) = enigo.location() {
                // Retrieve the window's outer position (top-left corner)
                if let Ok(position) = window.outer_position() {
                    // Retrieve the window's inner size (client area)
                    if let Ok(size) = window.inner_size() {
                        // Calculate the center position of the title bar
                        let x = position.x + (size.width as i32 / 2);
                        let y = if is_chat_mode {
                            position.y + size.height as i32 - 50
                        } else {
                            position.y + 30
                        };

                        // Move the mouse cursor to the calculated position
                        if enigo.move_mouse(x, y, Coordinate::Abs).is_ok() {
                            // // Simulate a left mouse click
                            let _ = enigo.button(Button::Left, Direction::Click);
                            // let _ = enigo.button(Button::Left, Direction::Release);

                            thread::sleep(Duration::from_millis(100));

                            // Move the mouse cursor back to the original position
                            let _ = enigo.move_mouse(original_x, original_y, Coordinate::Abs);
                        }
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = window;
        let _ = is_chat_mode;
    }
}
