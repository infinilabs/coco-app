// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use coco_lib::util::logging::app_log_dir;
use std::fs::OpenOptions;
use std::io::Write;

/// Set up panic hook to log panic information to a file
fn setup_panic_hook() {
    std::panic::set_hook(Box::new(|panic_info| {
        let timestamp = chrono::Local::now();
        // "%Y-%m-%d %H:%M:%S"
        //
        // I would like to use the above format, but Windows does not allow that
        // and complains with OS error 123.
        let datetime_str = timestamp.format("%Y-%m-%d-%H-%M-%S").to_string();

        let log_dir = app_log_dir();

        // Ensure the log directory exists
        if let Err(e) = std::fs::create_dir_all(&log_dir) {
            eprintln!("Panic hook error: failed to create log directory: {}", e);
            return;
        }

        let panic_file = log_dir.join(format!("{}_rust_panic.log", datetime_str));

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

        // Use `force_capture()` instead of `capture()` as we want backtrace
        // regardless of whether the corresponding env vars are set or not.
        let backtrace = std::backtrace::Backtrace::force_capture();

        let panic_log = format!(
            "Time: [{}]\nLocation: [{}]\nMessage: [{}]\nBacktrace: \n{}",
            datetime_str, location, panic_message, backtrace
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
    // Panic hook setup should be the first thing to do, everything could panic!
    setup_panic_hook();
    coco_lib::run();
}
