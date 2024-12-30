use std::{fs::create_dir, io::Read};

use tauri::{AppHandle, Emitter, Listener, Manager, Runtime, WebviewWindow};
use tauri_nspanel::{panel_delegate, ManagerExt, WebviewWindowExt};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

mod autostart;
use autostart::{change_autostart, enable_autostart};

#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;

#[cfg(target_os = "macos")]
const DEFAULT_SHORTCUT: &str = "command+shift+space";

#[cfg(any(target_os = "windows", target_os = "linux"))]
const DEFAULT_SHORTCUT: &str = "ctrl+shift+space";

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn change_window_height(handle: AppHandle, height: u32) {
    let window: WebviewWindow = handle.get_webview_window("main").unwrap();

    let mut size = window.outer_size().unwrap();
    size.height = height;
    window.set_size(size).unwrap();
}

#[tauri::command]
fn show_panel(handle: AppHandle) {
    let panel = handle.get_webview_panel("main").unwrap();

    panel.show();
}

#[tauri::command]
fn hide_panel(handle: AppHandle) {
    let panel = handle.get_webview_panel("main").unwrap();

    panel.order_out(None);
}

#[tauri::command]
fn close_panel(handle: AppHandle) {
    let panel = handle.get_webview_panel("main").unwrap();

    panel.released_when_closed(true);

    panel.close();
}

#[derive(serde::Deserialize)]
struct ThemeChangedPayload {
    is_dark_mode: bool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut ctx = tauri::generate_context!();

    tauri::Builder::default()
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            None,
        ))
        .plugin(tauri_plugin_theme::init(ctx.config_mut()))
        .invoke_handler(tauri::generate_handler![
            greet,
            change_window_height,
            change_shortcut,
            get_current_shortcut,
            change_autostart,
            hide_coco,
            switch_tray_icon,
            show_panel,
            hide_panel,
            close_panel
        ])
        .setup(|app| {
            init(app.app_handle());

            enable_shortcut(app);
            enable_tray(app);
            enable_autostart(app);

            #[cfg(target_os = "macos")]
            app.set_activation_policy(ActivationPolicy::Accessory);

            app.listen("theme-changed", move |event| {
                if let Ok(payload) = serde_json::from_str::<ThemeChangedPayload>(&event.payload()) {
                    // switch_tray_icon(app.app_handle(), payload.is_dark_mode);
                    println!("Theme changed: is_dark_mode = {}", payload.is_dark_mode);
                }
            });

            Ok(())
        })
        .run(ctx)
        .expect("error while running tauri application");
}

fn init(app_handle: &AppHandle) {
    let window: WebviewWindow = app_handle.get_webview_window("main").unwrap();

    let panel = window.to_panel().unwrap();

    let delegate = panel_delegate!(MyPanelDelegate {
        window_did_become_key,
        window_did_resign_key
    });

    let handle = app_handle.to_owned();

    delegate.set_listener(Box::new(move |delegate_name: String| {
        match delegate_name.as_str() {
            "window_did_become_key" => {
                let app_name = handle.package_info().name.to_owned();

                println!("[info]: {:?} panel becomes key window!", app_name);
            }
            "window_did_resign_key" => {
                println!("[info]: panel resigned from key window!");
            }
            _ => (),
        }
    }));

    panel.set_delegate(delegate);
}

fn enable_shortcut(app: &mut tauri::App) {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

    let window = app.get_webview_window("main").unwrap();

    let command_shortcut: Shortcut = current_shortcut(app.app_handle()).unwrap();

    app.handle()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |_app, shortcut, event| {
                    //println!("{:?}", shortcut);
                    if shortcut == &command_shortcut {
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

    app.global_shortcut().register(command_shortcut).unwrap();
}

#[tauri::command]
fn change_shortcut<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    key: String,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;
    use tauri_plugin_global_shortcut::ShortcutState;

    if let Err(e) = remove_shortcut(&app) {
        eprintln!("Failed to remove old shortcut: {}", e);
    }

    let main_window = app.get_webview_window("main").unwrap();

    let shortcut: Shortcut = key
        .parse()
        .map_err(|_| "The format of the shortcut key is incorrect".to_owned())?;
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
        .map_err(|_| "Failed to register new shortcut key".to_owned())?;

    let path = app.path().app_config_dir().unwrap();
    if path.exists() == false {
        create_dir(&path).unwrap();
    }

    let file_path = path.join("shortcut.txt");
    let mut file = File::create(file_path).unwrap();
    file.write_all(key.as_bytes()).unwrap();

    Ok(())
}

#[tauri::command]
fn get_current_shortcut<R: Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    let res = current_shortcut(&app)?;

    Ok(res.into_string())
}

#[tauri::command]
fn hide_coco(app: tauri::AppHandle) {
    if let Some(window) = app.get_window("main") {
        match window.is_visible() {
            Ok(true) => {
                if let Err(err) = window.hide() {
                    eprintln!("Failed to hide the window: {}", err);
                } else {
                    println!("Window successfully hidden.");
                }
            }
            Ok(false) => {
                println!("Window is already hidden.");
            }
            Err(err) => {
                eprintln!("Failed to check window visibility: {}", err);
            }
        }
    } else {
        eprintln!("Main window not found.");
    }
}

fn current_shortcut<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<Shortcut, String> {
    use std::fs::File;

    let path = app.path().app_config_dir().unwrap();
    let mut old_value = DEFAULT_SHORTCUT.to_owned();

    if path.exists() {
        let file_path = path.join("shortcut.txt");
        if file_path.exists() {
            let mut file = File::open(file_path).unwrap();
            let mut data = String::new();
            if let Ok(_) = file.read_to_string(&mut data) {
                if data.is_empty() == false {
                    old_value = data
                }
            }
        }
    };
    let short: Shortcut = old_value.parse().unwrap();

    Ok(short)
}

#[allow(dead_code)]
fn remove_shortcut<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    let short = current_shortcut(app)?;

    app.global_shortcut().unregister(short).unwrap();

    Ok(())
}

fn handle_open_coco(app: &AppHandle) {
    println!("Open Coco menu clicked!");

    if let Some(window) = app.get_window("main") {
        window.show().unwrap();
        window.set_focus().unwrap();
    } else {
        eprintln!("Failed to get main window.");
    }
}

fn handle_hide_coco(app: &AppHandle) {
    println!("Hide Coco menu clicked!");

    if let Some(window) = app.get_window("main") {
        if let Err(err) = window.hide() {
            eprintln!("Failed to hide the window: {}", err);
        } else {
            println!("Window successfully hidden.");
        }
    } else {
        eprintln!("Main window not found.");
    }
}

#[tauri::command]
fn switch_tray_icon(app: tauri::AppHandle, is_dark_mode: bool) {
    let app_handle = app.app_handle();

    println!("is_dark_mode: {}", is_dark_mode);

    const DARK_ICON_PATH: &[u8] = include_bytes!("../icons/dark@2x.png");
    const LIGHT_ICON_PATH: &[u8] = include_bytes!("../icons/light@2x.png");

    let icon_path: &[u8] = if is_dark_mode {
        DARK_ICON_PATH
    } else {
        LIGHT_ICON_PATH
    };

    let tray = match app_handle.tray_by_id("tray") {
        Some(tray) => tray,
        None => {
            eprintln!("Tray with ID 'tray' not found");
            return;
        }
    };

    if let Err(e) = tray.set_icon(Some(
        tauri::image::Image::from_bytes(icon_path)
            .unwrap_or_else(|e| panic!("Failed to load icon from bytes: {}", e)),
    )) {
        eprintln!("Failed to set tray icon: {}", e);
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
    let open_i = MenuItem::with_id(app, "open", "Open Coco", true, None::<&str>).unwrap();
    let about_i = MenuItem::with_id(app, "about", "About Coco", true, None::<&str>).unwrap();
    let hide_i = MenuItem::with_id(app, "hide", "Hide Coco", true, None::<&str>).unwrap();

    let menu = MenuBuilder::new(app)
        .item(&open_i)
        .separator()
        .item(&hide_i)
        .item(&about_i)
        .item(&settings_i)
        .separator()
        .item(&quit_i)
        .build()
        .unwrap();

    let _tray = TrayIconBuilder::with_id("tray")
        // .icon(app.default_window_icon().unwrap().clone())
        .icon(Image::from_bytes(include_bytes!("../icons/light@2x.png")).expect("REASON"))
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
                let _ = app.emit("open_settings", "");

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
