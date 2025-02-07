use tauri::{App, WebviewWindow};

#[cfg(target_os = "macos")]
mod mac;

#[cfg(target_os = "windows")]
mod win;

#[cfg(target_os = "linux")]
mod linux;
mod linux;
mod windows;

#[cfg(target_os = "macos")]
pub use mac::*;

#[cfg(target_os = "windows")]
pub use win::*;

#[cfg(target_os = "linux")]
pub use linux::*;

pub fn default(app: &mut App, main_window: WebviewWindow, settings_window: WebviewWindow) {
    platform(app, main_window.clone(), settings_window.clone());
}