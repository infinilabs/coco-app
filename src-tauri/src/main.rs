// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    not(debug_assertions),
    windows_subsystem = "windows"
)]

use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_nspanel::{panel_delegate, ManagerExt, WebviewWindowExt};

fn main() {
    coco_lib::run();

    tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_nspanel::init())
        .invoke_handler(tauri::generate_handler![
            show_panel,
            hide_panel,
            close_panel
        ])
        .setup(|app| {
            init(app.app_handle());

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
