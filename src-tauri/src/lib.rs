mod assistant;
mod autostart;
mod common;
mod extension;
mod search;
mod server;
mod settings;
mod setup;
mod shortcut;
mod util;

use crate::common::register::SearchSourceRegistry;
// use crate::common::traits::SearchSource;
use crate::common::{CHECK_WINDOW_LABEL, MAIN_WINDOW_LABEL, SETTINGS_WINDOW_LABEL};
use crate::server::servers::{load_or_insert_default_server, load_servers_token};
use autostart::{change_autostart, ensure_autostart_state_consistent};
use lazy_static::lazy_static;
use std::sync::Mutex;
use std::sync::OnceLock;
use tauri::async_runtime::block_on;
use tauri::plugin::TauriPlugin;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, Runtime, WebviewWindow, WindowEvent};
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

    let mut app_builder = tauri::Builder::default();
    // Set up logger first
    app_builder = app_builder.plugin(set_up_tauri_logger());

    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            log::debug!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
            // when defining deep link schemes at runtime, you must also check `argv` here
        }));
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_windows_version::init())
        .plugin(tauri_plugin_opener::init());

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
            show_check,
            hide_check,
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
            assistant::chat_create,
            assistant::send_message,
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
            server::websocket::connect_to_server,
            server::websocket::disconnect,
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
            extension::list_extensions,
            extension::enable_extension,
            extension::disable_extension,
            extension::set_extension_alias,
            extension::register_extension_hotkey,
            extension::unregister_extension_hotkey,
            extension::is_extension_enabled,
            extension::third_party::store::search_extension,
            extension::third_party::store::install_extension_from_store,
            extension::third_party::uninstall_extension,
            settings::set_allow_self_signature,
            settings::get_allow_self_signature,
            assistant::ask_ai,
            crate::common::document::open,
            #[cfg(any(target_os = "macos", target_os = "windows"))]
            extension::built_in::file_search::config::get_file_system_config,
            #[cfg(any(target_os = "macos", target_os = "windows"))]
            extension::built_in::file_search::config::set_file_system_config,
            server::synthesize::synthesize,
            util::file::get_file_icon,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                log::trace!("hiding Dock icon on macOS");
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                log::trace!("Dock icon should be hidden now");
            }

            let app_handle = app.handle().clone();
            GLOBAL_TAURI_APP_HANDLE
                .set(app_handle.clone())
                .expect("variable already initialized");
            log::trace!("global Tauri app handle set");

            let registry = SearchSourceRegistry::default();

            app.manage(registry); // Store registry in Tauri's app state
            app.manage(server::websocket::WebSocketManager::default());

            block_on(async {
                init(app.handle()).await;
            });

            shortcut::enable_shortcut(app);

            ensure_autostart_state_consistent(app)?;

            // app.listen("theme-changed", move |event| {
            //     if let Ok(payload) = serde_json::from_str::<ThemeChangedPayload>(event.payload()) {
            //         // switch_tray_icon(app.app_handle(), payload.is_dark_mode);
            //         log::debug!("Theme changed: is_dark_mode = {}", payload.is_dark_mode);
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
            let check_window = app.get_webview_window(CHECK_WINDOW_LABEL).unwrap();
            setup::default(
                app,
                main_window.clone(),
                settings_window.clone(),
                check_window.clone(),
            );

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

pub async fn init<R: Runtime>(app_handle: &AppHandle<R>) {
    // Await the async functions to load the servers and tokens
    if let Err(err) = load_or_insert_default_server(app_handle).await {
        log::error!("Failed to load servers: {}", err);
    }

    if let Err(err) = load_servers_token(app_handle).await {
        log::error!("Failed to load server tokens: {}", err);
    }

    let coco_servers = server::servers::get_all_servers();

    // Get the registry from Tauri's state
    // let registry: State<SearchSourceRegistry> = app_handle.state::<SearchSourceRegistry>();

    for server in coco_servers {
        crate::server::servers::try_register_server_to_search_source(app_handle.clone(), &server)
            .await;
    }

    extension::built_in::pizza_engine_runtime::start_pizza_engine_runtime().await;
}

#[tauri::command]
async fn show_coco<R: Runtime>(app_handle: AppHandle<R>) {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        move_window_to_active_monitor(&window);

        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        let _ = app_handle.emit("show-coco", ());
    }
}

#[tauri::command]
async fn hide_coco<R: Runtime>(app: AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        if let Err(err) = window.hide() {
            log::error!("Failed to hide the window: {}", err);
        } else {
            log::debug!("Window successfully hidden.");
        }
    } else {
        log::error!("Main window not found.");
    }
}

fn move_window_to_active_monitor<R: Runtime>(window: &WebviewWindow<R>) {
    //dbg!("Moving window to active monitor");
    // Try to get the available monitors, handle failure gracefully
    let available_monitors = match window.available_monitors() {
        Ok(monitors) => monitors,
        Err(e) => {
            log::error!("Failed to get monitors: {}", e);
            return;
        }
    };

    // Attempt to get the cursor position, handle failure gracefully
    let cursor_position = match window.cursor_position() {
        Ok(pos) => Some(pos),
        Err(e) => {
            log::error!("Failed to get cursor position: {}", e);
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
            log::error!("No monitor found!");
            return;
        }
    };

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

    // Get the current size of the window
    let window_size = match window.inner_size() {
        Ok(size) => size,
        Err(e) => {
            log::error!("Failed to get window size: {}", e);
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
        log::error!("Failed to move window: {}", e);
    }

    if let Some(name) = monitor.name() {
        log::debug!("Window moved to monitor: {}", name);

        let mut previous_monitor = PREVIOUS_MONITOR_NAME.lock().unwrap();
        *previous_monitor = Some(name.to_string());
    }
}

#[tauri::command]
async fn get_app_search_source<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
    // We want all the extensions here, so no filter condition specified.
    let (_found_invalid_extensions, extensions) = extension::list_extensions(None, None, false)
        .await
        .map_err(|e| e.to_string())?;
    extension::init_extensions(extensions).await?;

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

/// Log format:
///
/// ```text
/// [time] [log level] [file module:line] message
/// ```
///
/// Example:
///
///
/// ```text
/// [05-11 17:00:00] [INF] [coco_lib:625] Coco-AI started
/// ```
fn set_up_tauri_logger() -> TauriPlugin<tauri::Wry> {
    use log::Level;
    use log::LevelFilter;
    use tauri_plugin_log::Builder;

    /// Coco-AI app's default log level.
    const DEFAULT_LOG_LEVEL: LevelFilter = LevelFilter::Info;
    const LOG_LEVEL_ENV_VAR: &str = "COCO_LOG";

    fn format_log_level(level: Level) -> &'static str {
        match level {
            Level::Trace => "TRC",
            Level::Debug => "DBG",
            Level::Info => "INF",
            Level::Warn => "WAR",
            Level::Error => "ERR",
        }
    }

    fn format_target_and_line(record: &log::Record) -> String {
        let mut str = record.target().to_string();
        if let Some(line) = record.line() {
            str.push(':');
            str.push_str(&line.to_string());
        }

        str
    }

    /// Allow us to configure dynamic log levels via environment variable `COCO_LOG`.
    ///
    /// Generally, it mirros the behavior of `env_logger`. Syntax: `COCO_LOG=[target][=][level][,...]`
    ///
    /// * If this environment variable is not set, use the default log level.
    /// * If it is set, respect it:
    ///
    /// * `COCO_LOG=coco_lib` turns on all logging for the `coco_lib` module, which is
    ///   equivalent to `COCO_LOG=coco_lib=trace`
    /// * `COCO_LOG=trace` turns on all logging for the application, regardless of its name
    /// * `COCO_LOG=TRACE` turns on all logging for the application, regardless of its name (same as previous)
    /// * `COCO_LOG=reqwest=debug` turns on debug logging for `reqwest`
    /// * `COCO_LOG=trace,tauri=off` turns on all the logging except for the logs come from `tauri`
    /// * `COCO_LOG=off` turns off all logging for the application
    /// * `COCO_LOG=` Since the value is empty, turns off all logging for the application as well
    fn dynamic_log_level(mut builder: Builder) -> Builder {
        let Some(log_levels) = std::env::var_os(LOG_LEVEL_ENV_VAR) else {
            return builder.level(DEFAULT_LOG_LEVEL);
        };

        builder = builder.level(LevelFilter::Off);

        let log_levels = log_levels.into_string().unwrap_or_else(|e| {
            panic!(
                "The value '{}' set in environment varaible '{}' is not UTF-8 encoded",
                // Cannot use `.display()` here becuase that requires MSRV 1.87.0
                e.to_string_lossy(),
                LOG_LEVEL_ENV_VAR
            )
        });

        // COCO_LOG=[target][=][level][,...]
        let target_log_levels = log_levels.split(',');
        for target_log_level in target_log_levels {
            #[allow(clippy::collapsible_else_if)]
            if let Some(char_index) = target_log_level.chars().position(|c| c == '=') {
                let (target, equal_sign_and_level) = target_log_level.split_at(char_index);
                // Remove the equal sign, we know it takes 1 byte
                let level = &equal_sign_and_level[1..];

                if let Ok(level) = level.parse::<LevelFilter>() {
                    // Here we have to call `.to_string()` because `Cow<'static, str>` requires `&'static str`
                    builder = builder.level_for(target.to_string(), level);
                } else {
                    panic!(
                        "log level '{}' set in '{}={}' is invalid",
                        level, target, level
                    );
                }
            } else {
                if let Ok(level) = target_log_level.parse::<LevelFilter>() {
                    // This is a level
                    builder = builder.level(level);
                } else {
                    // This is a target, enable all the logging
                    //
                    // Here we have to call `.to_string()` because `Cow<'static, str>` requires `&'static str`
                    builder = builder.level_for(target_log_level.to_string(), LevelFilter::Trace);
                }
            }
        }

        builder
    }

    // When running the built binary, set `COCO_LOG` to `coco_lib=trace` to capture all logs
    // that come from Coco in the log file, which helps with debugging.
    if !tauri::is_dev() {
        // We have absolutely no guarantee that we (We have control over the Rust
        // code, but definitely no idea about the libc C code, all the shared objects
        // that we will link) will not concurrently read/write `envp`, so just use unsafe.
        unsafe {
            std::env::set_var("COCO_LOG", "coco_lib=trace");
        }
    }

    let mut builder = tauri_plugin_log::Builder::new();
    builder = builder.format(|out, message, record| {
        let now = chrono::Local::now().format("%m-%d %H:%M:%S");
        let level = format_log_level(record.level());
        let target_and_line = format_target_and_line(record);
        out.finish(format_args!(
            "[{}] [{}] [{}] {}",
            now, level, target_and_line, message
        ));
    });
    builder = dynamic_log_level(builder);

    builder.build()
}
