use std::{fs::create_dir, io::Read};

use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindow};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut ctx = tauri::generate_context!();

    tauri::Builder::default()
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
        ])
        .setup(|app| {
            init(app.app_handle());

            enable_shortcut(app);
            enable_tray(app);
            enable_autostart(app);

            #[cfg(target_os = "macos")]
            app.set_activation_policy(ActivationPolicy::Accessory);

            Ok(())
        })
        .run(ctx)
        .expect("error while running tauri application");
}

fn init(_app_handle: &AppHandle) {}

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
                    if main_window.is_focused().unwrap() {
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

fn enable_tray(app: &mut tauri::App) {
    use tauri::{
        menu::{MenuBuilder, MenuItem},
        tray::TrayIconBuilder,
    };

    let quit_i = MenuItem::with_id(app, "quit", "Quit Coco", true, None::<&str>).unwrap();
    let settings_i = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>).unwrap();
    let open_i = MenuItem::with_id(app, "open", "Open Coco", true, None::<&str>).unwrap();
    let about_i = MenuItem::with_id(app, "about", "About Coco", true, None::<&str>).unwrap();

    let menu = MenuBuilder::new(app)
        .item(&open_i)
        .separator()
        .item(&about_i)
        .item(&settings_i)
        .separator()
        .item(&quit_i)
        .build()
        .unwrap();

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                handle_open_coco(app);
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
