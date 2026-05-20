//! macOS permissions handling module
//!
//! This module provides proper async handling for camera and microphone permissions
//! on macOS, fixing the issues with tauri-plugin-macos-permissions.

use tauri::command;

#[cfg(target_os = "macos")]
use {
    block2::RcBlock,
    objc2::{class, msg_send, runtime::Bool},
    objc2_foundation::NSString,
    std::sync::mpsc,
    std::time::Duration,
};

/// Authorization status for AVCaptureDevice
/// Reference: https://developer.apple.com/documentation/avfoundation/avauthorizationstatus
#[cfg(target_os = "macos")]
#[repr(i32)]
enum AVAuthorizationStatus {
    NotDetermined = 0,
    Restricted = 1,
    Denied = 2,
    Authorized = 3,
}

/// Check camera permission status.
///
/// Returns `true` if camera permission is granted, `false` otherwise.
#[command]
pub async fn check_camera_permission() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        let av_media_type = NSString::from_str("vide");
        let status: i32 = msg_send![
            class!(AVCaptureDevice),
            authorizationStatusForMediaType: &*av_media_type
        ];

        status == AVAuthorizationStatus::Authorized as i32
    }

    #[cfg(not(target_os = "macos"))]
    true
}

/// Request camera permission with proper async handling.
///
/// This function properly handles the asynchronous nature of macOS permission requests.
/// It waits for the user to respond to the system permission dialog.
///
/// Returns:
/// - `Ok(true)` if permission was granted
/// - `Ok(false)` if permission was denied
/// - `Err(String)` if an error occurred
#[command]
pub async fn request_camera_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let av_media_type = NSString::from_str("vide");

        // First check current status
        let status: i32 = msg_send![
            class!(AVCaptureDevice),
            authorizationStatusForMediaType: &*av_media_type
        ];

        // If already authorized, return immediately
        if status == AVAuthorizationStatus::Authorized as i32 {
            return Ok(true);
        }

        // If restricted or denied, we can't request again
        if status == AVAuthorizationStatus::Restricted as i32
            || status == AVAuthorizationStatus::Denied as i32
        {
            return Ok(false);
        }

        // Create a channel to receive the callback result
        let (tx, rx) = mpsc::channel::<bool>();

        // Create a completion handler block using block2
        let block = RcBlock::new(move |granted: Bool| {
            let _ = tx.send(granted.as_bool());
        });

        // Call the requestAccessForMediaType with our completion handler
        let _: () = msg_send![
            class!(AVCaptureDevice),
            requestAccessForMediaType: &*av_media_type,
            completionHandler: &*block
        ];

        // Wait for the callback with a timeout
        match rx.recv_timeout(Duration::from_secs(60)) {
            Ok(granted) => Ok(granted),
            Err(_) => Err("Permission request timed out".to_string()),
        }
    }

    #[cfg(not(target_os = "macos"))]
    Ok(true)
}

/// Check microphone permission status.
///
/// Returns `true` if microphone permission is granted, `false` otherwise.
#[command]
pub async fn check_microphone_permission() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        let av_media_type = NSString::from_str("soun");
        let status: i32 = msg_send![
            class!(AVCaptureDevice),
            authorizationStatusForMediaType: &*av_media_type
        ];

        status == AVAuthorizationStatus::Authorized as i32
    }

    #[cfg(not(target_os = "macos"))]
    true
}

/// Request microphone permission with proper async handling.
///
/// Returns:
/// - `Ok(true)` if permission was granted
/// - `Ok(false)` if permission was denied
/// - `Err(String)` if an error occurred
#[command]
pub async fn request_microphone_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let av_media_type = NSString::from_str("soun");

        let status: i32 = msg_send![
            class!(AVCaptureDevice),
            authorizationStatusForMediaType: &*av_media_type
        ];

        if status == AVAuthorizationStatus::Authorized as i32 {
            return Ok(true);
        }

        if status == AVAuthorizationStatus::Restricted as i32
            || status == AVAuthorizationStatus::Denied as i32
        {
            return Ok(false);
        }

        let (tx, rx) = mpsc::channel::<bool>();

        let block = RcBlock::new(move |granted: Bool| {
            let _ = tx.send(granted.as_bool());
        });

        let _: () = msg_send![
            class!(AVCaptureDevice),
            requestAccessForMediaType: &*av_media_type,
            completionHandler: &*block
        ];

        match rx.recv_timeout(Duration::from_secs(60)) {
            Ok(granted) => Ok(granted),
            Err(_) => Err("Permission request timed out".to_string()),
        }
    }

    #[cfg(not(target_os = "macos"))]
    Ok(true)
}
