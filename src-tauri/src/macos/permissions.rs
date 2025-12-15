#[tauri::command]
pub fn check_accessibility_trusted() -> bool {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            macos_accessibility_client::accessibility::application_is_trusted()
        } else {
            false
        }
    }
}

#[tauri::command]
pub fn open_accessibility_settings() {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            use std::process::Command;
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
            let _ = Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
                .status();
        } else {
            // no-op on non-macOS
        }
    }
}
