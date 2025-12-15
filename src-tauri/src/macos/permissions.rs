#[tauri::command]
pub fn check_accessibility_trusted() -> bool {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            let trusted = macos_accessibility_client::accessibility::application_is_trusted();
            log::info!(target: "coco_lib::permissions", "check_accessibility_trusted invoked: {}", trusted);
            trusted
        } else {
            log::info!(target: "coco_lib::permissions", "check_accessibility_trusted invoked on non-macOS: false");
            false
        }
    }
}

#[tauri::command]
pub fn open_accessibility_settings() {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            use std::process::Command;
            log::info!(target: "coco_lib::permissions", "open_accessibility_settings invoked");
            let _ = Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
                .status();
        } else {
            // no-op on non-macOS
        }
    }
}

#[tauri::command]
pub fn open_screen_recording_settings() {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            use std::process::Command;
            log::info!(target: "coco_lib::permissions", "open_screen_recording_settings invoked");
            let _ = Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenRecording")
                .status();
        } else {
            // no-op on non-macOS
        }
    }
}

#[tauri::command]
pub fn open_microphone_settings() {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            use std::process::Command;
            log::info!(target: "coco_lib::permissions", "open_microphone_settings invoked");
            let _ = Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
                .status();
        } else {
            // no-op on non-macOS
        }
    }
}
