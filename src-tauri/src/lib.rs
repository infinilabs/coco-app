mod autostart;
mod common;
mod local;
mod search;
mod server;
mod shortcut;
mod util;

mod setup;

use crate::common::register::SearchSourceRegistry;
// use crate::common::traits::SearchSource;
use crate::common::{MAIN_WINDOW_LABEL, SETTINGS_WINDOW_LABEL};
use crate::server::search::CocoSearchSource;
use crate::server::servers::{load_or_insert_default_server, load_servers_token};
use autostart::{change_autostart, enable_autostart};
use reqwest::Client;
use std::path::PathBuf;
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
use tauri::{
    AppHandle, Emitter, Listener, Manager, PhysicalPosition, Runtime, State, WebviewWindow, Window,
    WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt;
use tokio::runtime::Runtime as RT;

/// Tauri store name
pub(crate) const COCO_TAURI_STORE: &str = "coco_tauri_store";

#[tauri::command]
fn change_window_height(handle: AppHandle, height: u32) {
    let window: WebviewWindow = handle.get_webview_window(MAIN_WINDOW_LABEL).unwrap();

    let mut size = window.outer_size().unwrap();
    size.height = height;
    window.set_size(size).unwrap();
}

#[derive(serde::Deserialize)]
struct ThemeChangedPayload {
    is_dark_mode: bool,
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut ctx = tauri::generate_context!();
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
        .plugin(tauri_plugin_theme::init(ctx.config_mut()))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build());

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
            hide_coco,
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
            server::datasource::get_datasources_by_server,
            server::connector::get_connectors_by_server,
            search::query_coco_fusion,
            // server::get_user_profiles,
            // server::get_coco_server_datasources,
            // server::get_coco_server_connectors,
            server::websocket::connect_to_server,
            server::websocket::disconnect,
        ])
        .setup(|app| {
            let registry = SearchSourceRegistry::default();

            app.manage(registry); // Store registry in Tauri's app state
            app.manage(server::websocket::WebSocketManager::default());

            // Get app handle
            let app_handle = app.handle().clone();

            // Create a single Tokio runtime instance
            let rt = RT::new().expect("Failed to create Tokio runtime");

            // Use the runtime to spawn the async initialization tasks
            let init_app_handle = app.handle().clone();
            rt.spawn(async move {
                init(&init_app_handle).await; // Pass a reference to `app_handle`
            });

            shortcut::enable_shortcut(&app);
            enable_tray(app);
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

    // Create a single Tokio runtime instance
    let rt = RT::new().expect("Failed to create Tokio runtime");
    let app_handle = app.handle().clone();
    rt.spawn(async move {
        init_app_search_source(&app_handle).await;
        let _ = server::connector::refresh_all_connectors(&app_handle).await;
        let _ = server::datasource::refresh_all_datasources(&app_handle).await;
    });

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
    let registry: State<SearchSourceRegistry> = app_handle.state::<SearchSourceRegistry>();

    for server in coco_servers {
        let source = CocoSearchSource::new(server.clone(), Client::new());
        registry.register_source(source).await;
    }
}

async fn init_app_search_source<R: Runtime>(app_handle: &AppHandle<R>) {
    // Run the slow application directory search in the background
    let dir = vec![
        dirs::home_dir().map(|home| home.join("Applications")), // Resolve `~/Applications`
        Some(PathBuf::from("/Applications")),
        Some(PathBuf::from("/System/Applications")),
        Some(PathBuf::from("/System/Applications/Utilities")),
    ];

    // Remove any `None` values if `home_dir()` fails
    let app_dirs: Vec<PathBuf> = dir.into_iter().flatten().collect();

    let application_search = local::application::ApplicationSearchSource::new(1000f64, app_dirs);

    // Register the application search source
    let registry = app_handle.state::<SearchSourceRegistry>();
    registry.register_source(application_search).await;
}

#[tauri::command]
fn hide_coco(app: tauri::AppHandle) {
    if let Some(window) = app.get_window(MAIN_WINDOW_LABEL) {
        match window.is_visible() {
            Ok(true) => {
                if let Err(err) = window.hide() {
                    eprintln!("Failed to hide the window: {}", err);
                }
            }
            Ok(false) => {
                println!("Window is already hidden.");
            }
            Err(err) => {
                eprintln!("Failed to check window visibility: {}", err);
            }
        }
    }
}

fn handle_open_coco(app: &AppHandle) {
    if let Some(window) = app.get_window(MAIN_WINDOW_LABEL) {
        move_window_to_active_monitor(&window);

        window.show().unwrap();
        window.set_visible_on_all_workspaces(true).unwrap();
        window.set_always_on_top(true).unwrap();
        window.set_focus().unwrap();
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
}

fn handle_hide_coco(app: &AppHandle) {
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

fn enable_tray(app: &mut tauri::App) {
    use tauri::{
        image::Image,
        menu::{MenuBuilder, MenuItem},
        tray::TrayIconBuilder,
    };

    let quit_i = MenuItem::with_id(app, "quit", "Quit Coco", true, None::<&str>).unwrap();
    let settings_i = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>).unwrap();
    let open_i = MenuItem::with_id(app, "open", "Show Coco", true, None::<&str>).unwrap();
    // let about_i = MenuItem::with_id(app, "about", "About Coco", true, None::<&str>).unwrap();
    // let hide_i = MenuItem::with_id(app, "hide", "Hide Coco", true, None::<&str>).unwrap();

    let menu = MenuBuilder::new(app)
        .item(&open_i)
        .separator()
        // .item(&hide_i)
        // .item(&about_i)
        .item(&settings_i)
        .separator()
        .item(&quit_i)
        .build()
        .unwrap();

    let _tray = TrayIconBuilder::with_id("tray")
        .icon_as_template(true)
        // .icon(app.default_window_icon().unwrap().clone())
        .icon(
            Image::from_bytes(include_bytes!("../assets/tray-mac.ico"))
                .expect("Failed to load icon"),
        )
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                handle_open_coco(app);
            }
            "hide" => {
                handle_hide_coco(app);
            }
            "about" => {
                let _ = app.emit("open_settings", "about");
            }
            "settings" => {
                // windows failed to open second window, issue: https://github.com/tauri-apps/tauri/issues/11144 https://github.com/tauri-apps/tauri/issues/8196
                //#[cfg(windows)]
                let _ = app.emit("open_settings", "settings");

                // #[cfg(not(windows))]
                // open_settings(&app);
            }
            "quit" => {
                println!("quit menu item was clicked");
                app.exit(0);
            }
            _ => {
                println!("menu item {:?} not handled", event.id);
            }
        })
        .build(app)
        .unwrap();
}

#[allow(dead_code)]
fn open_settings(app: &tauri::AppHandle) {
    use tauri::webview::WebviewBuilder;
    println!("settings menu item was clicked");
    let window = app.get_webview_window("settings");
    if let Some(window) = window {
        window.show().unwrap();
        window.set_focus().unwrap();
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
