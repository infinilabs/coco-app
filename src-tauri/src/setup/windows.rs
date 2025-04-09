use tauri::{App, WebviewWindow};

pub fn platform(_app: &mut App, main_window: WebviewWindow, _settings_window: WebviewWindow) {
    let _ = main_window.set_shadow(false);
}
