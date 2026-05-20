//! macOS permissions handling module
//!
//! This module provides proper async handling for camera and microphone permissions
//! on macOS, fixing the issues with tauri-plugin-macos-permissions.

use tauri::command;

#[cfg(target_os = "macos")]
use {
    objc2::{class, msg_send, runtime::Bool, ClassType},
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
        let (tx, rx) = mpsc::channel();

        // Create a completion handler that sends the result through the channel
        let completion_block = Box::new(move |granted: Bool| {
            let _ = tx.send(granted.as_bool());
        });

        // Convert the closure to a raw pointer
        let completion_ptr = Box::into_raw(completion_block);

        // Define the block structure for Objective-C runtime
        type CompletionHandler = extern "C" fn(*mut std::ffi::c_void, Bool);

        extern "C" fn trampoline(block_ptr: *mut std::ffi::c_void, granted: Bool) {
            unsafe {
                let closure: Box<Box<dyn FnOnce(Bool)>> =
                    Box::from_raw(block_ptr as *mut Box<dyn FnOnce(Bool)>);
                closure(granted);
            }
        }

        #[repr(C)]
        struct Block {
            isa: *const std::ffi::c_void,
            flags: i32,
            reserved: i32,
            invoke: CompletionHandler,
            descriptor: *const BlockDescriptor,
            closure: *mut std::ffi::c_void,
        }

        #[repr(C)]
        struct BlockDescriptor {
            reserved: usize,
            size: usize,
            copy_helper: Option<extern "C" fn(*mut std::ffi::c_void, *const std::ffi::c_void)>,
            dispose_helper: Option<extern "C" fn(*mut std::ffi::c_void)>,
        }

        static DESCRIPTOR: BlockDescriptor = BlockDescriptor {
            reserved: 0,
            size: std::mem::size_of::<Block>(),
            copy_helper: None,
            dispose_helper: Some(dispose_helper),
        };

        extern "C" fn dispose_helper(block: *mut std::ffi::c_void) {
            unsafe {
                let block = block as *mut Block;
                let _ = Box::from_raw((*block).closure as *mut Box<dyn FnOnce(Bool)>);
            }
        }

        // Get the _NSConcreteStackBlock class
        extern "C" {
            static _NSConcreteStackBlock: *const std::ffi::c_void;
        }

        let block = Block {
            isa: &_NSConcreteStackBlock,
            flags: 1 << 25, // BLOCK_HAS_COPY_DISPOSE
            reserved: 0,
            invoke: trampoline,
            descriptor: &DESCRIPTOR,
            closure: completion_ptr as *mut std::ffi::c_void,
        };

        // Call the requestAccessForMediaType with our completion handler
        let _: () = msg_send![
            class!(AVCaptureDevice),
            requestAccessForMediaType: &*av_media_type,
            completionHandler: &block
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

        let (tx, rx) = mpsc::channel();

        let completion_block = Box::new(move |granted: Bool| {
            let _ = tx.send(granted.as_bool());
        });

        let completion_ptr = Box::into_raw(completion_block);

        type CompletionHandler = extern "C" fn(*mut std::ffi::c_void, Bool);

        extern "C" fn trampoline(block_ptr: *mut std::ffi::c_void, granted: Bool) {
            unsafe {
                let closure: Box<Box<dyn FnOnce(Bool)>> =
                    Box::from_raw(block_ptr as *mut Box<dyn FnOnce(Bool)>);
                closure(granted);
            }
        }

        #[repr(C)]
        struct Block {
            isa: *const std::ffi::c_void,
            flags: i32,
            reserved: i32,
            invoke: CompletionHandler,
            descriptor: *const BlockDescriptor,
            closure: *mut std::ffi::c_void,
        }

        #[repr(C)]
        struct BlockDescriptor {
            reserved: usize,
            size: usize,
            copy_helper: Option<extern "C" fn(*mut std::ffi::c_void, *const std::ffi::c_void)>,
            dispose_helper: Option<extern "C" fn(*mut std::ffi::c_void)>,
        }

        static DESCRIPTOR: BlockDescriptor = BlockDescriptor {
            reserved: 0,
            size: std::mem::size_of::<Block>(),
            copy_helper: None,
            dispose_helper: Some(dispose_helper),
        };

        extern "C" fn dispose_helper(block: *mut std::ffi::c_void) {
            unsafe {
                let block = block as *mut Block;
                let _ = Box::from_raw((*block).closure as *mut Box<dyn FnOnce(Bool)>);
            }
        }

        extern "C" {
            static _NSConcreteStackBlock: *const std::ffi::c_void;
        }

        let block = Block {
            isa: &_NSConcreteStackBlock,
            flags: 1 << 25,
            reserved: 0,
            invoke: trampoline,
            descriptor: &DESCRIPTOR,
            closure: completion_ptr as *mut std::ffi::c_void,
        };

        let _: () = msg_send![
            class!(AVCaptureDevice),
            requestAccessForMediaType: &*av_media_type,
            completionHandler: &block
        ];

        match rx.recv_timeout(Duration::from_secs(60)) {
            Ok(granted) => Ok(granted),
            Err(_) => Err("Permission request timed out".to_string()),
        }
    }

    #[cfg(not(target_os = "macos"))]
    Ok(true)
}
