// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

/// Helper function to return the log directory.
///
/// This should return the same value as `tauri_app_handle.path().app_log_dir().unwrap()`.
fn app_log_dir() -> PathBuf {
    // This function `app_log_dir()` is for the panic hook, which should be set
    // before Tauri performs any initialization. At that point, we do not have
    // access to the identifier provided by Tauri, so we need to define our own
    // one here.
    //
    // NOTE: If you update identifier in the following files, update this one
    // as well!
    //
    // src-tauri/tauri.linux.conf.json
    // src-tauri/Entitlements.plist
    // src-tauri/tauri.conf.json
    // src-tauri/Info.plist
    const IDENTIFIER: &str = "rs.coco.app";

    #[cfg(target_os = "macos")]
    let path = dirs::home_dir()
        .expect("cannot find the home directory, Coco should never run in such a environment")
        .join("Library/Logs")
        .join(IDENTIFIER);

    #[cfg(not(target_os = "macos"))]
    let path = dirs::data_local_dir()
        .expect("app local dir is None, we should not encounter this")
        .join(IDENTIFIER)
        .join("logs");

    path
}

/// Set up panic hook to log panic information to a file
fn setup_panic_hook() {
    std::panic::set_hook(Box::new(|panic_info| {
        let timestamp = chrono::Local::now();
        let datetime_str = timestamp.format("%Y-%m-%d %H:%M:%S%.3f").to_string();

        let log_dir = app_log_dir();

        // Ensure the log directory exists
        if let Err(e) = std::fs::create_dir_all(&log_dir) {
            eprintln!("Panic hook error: failed to create log directory: {}", e);
            return;
        }

        let panic_file = log_dir.join(format!("{}.panic", datetime_str));

        // Prepare panic information
        let panic_message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic message".to_string()
        };

        let location = if let Some(location) = panic_info.location() {
            format!(
                "{}:{}:{}",
                location.file(),
                location.line(),
                location.column()
            )
        } else {
            "Unknown location".to_string()
        };

        let panic_log = format!(
            "[{}] PANIC: {} at {}\n",
            datetime_str, panic_message, location
        );

        // Write to panic file
        match OpenOptions::new()
            .create(true)
            .append(true)
            .open(&panic_file)
        {
            Ok(mut file) => {
                if let Err(e) = writeln!(file, "{}", panic_log) {
                    eprintln!("Panic hook error: Failed to write panic to file: {}", e);
                }
            }
            Err(e) => {
                eprintln!("Panic hook error: Failed to open panic log file: {}", e);
            }
        }
    }));
}

fn main() {
    // Panic hook should be the first thing to do, everything could panic!
    setup_panic_hook();
    coco_lib::run();
}
