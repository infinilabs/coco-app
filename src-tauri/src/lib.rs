use std::{fs::create_dir, io::Read};

use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
use tauri_nspanel::{panel_delegate, ManagerExt, WebviewWindowExt};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

const DEFAULT_SHORTCUT: &str = "command+shift+space";

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_nspanel::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            change_window_height,
            change_shortcut,
            show_panel,
            hide_panel,
            close_panel,
        ])
        .setup(|app| {
            init(app.app_handle());

            enable_autostart(app);
            enable_shortcut(app);
            enable_tray(app);

            Ok(())
        })
        .run(tauri::generate_context!())
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

fn enable_autostart(app: &mut tauri::App) {
    use tauri_plugin_autostart::MacosLauncher;
    use tauri_plugin_autostart::ManagerExt;

    app.handle()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            None,
        ))
        .unwrap();

    // Get the autostart manager
    let autostart_manager = app.autolaunch();
    // Enable autostart
    let _ = autostart_manager.enable();
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
                            println!("Command+B Pressed!");
                            if window.is_focused().unwrap() {
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
    window: tauri::Window<R>,
    key: String,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;
    use tauri_plugin_global_shortcut::ShortcutState;

    remove_shortcut(&app)?;

    let shortcut: Shortcut = key
        .parse()
        .map_err(|_| "The format of the shortcut key is incorrect".to_owned())?;
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, scut, event| {
            if scut == &shortcut {
                if let ShortcutState::Pressed = event.state() {
                    println!("Command+B Pressed!");
                    if window.is_focused().unwrap() {
                        window.hide().unwrap();
                    } else {
                        window.show().unwrap();
                        window.set_focus().unwrap();
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

fn remove_shortcut<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    let short = current_shortcut(app)?;

    app.global_shortcut().unregister(short).unwrap();

    Ok(())
}

fn enable_tray(app: &mut tauri::App) {
    use tauri::{
        image::Image,
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
    };

    let image = Image::from_path("icons/32x32.png").unwrap();

    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>).unwrap();
    let menu = Menu::with_items(app, &[&settings_i, &quit_i]).unwrap();
    let _tray = TrayIconBuilder::new()
        .icon(image)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "settings" => {
                println!("settings menu item was clicked");
                let app_handle = app.app_handle();
                if let Some(window) = app_handle.get_webview_window("settings") {
                  let _ = window.show();
                  let _ = window.set_focus();
                }
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
