//! credits to: https://github.com/ayangweb/ayangweb-EcoPaste/blob/169323dbe6365ffe4abb64d867439ed2ea84c6d1/src-tauri/src/core/setup/mac.rs

use cocoa::appkit::NSWindow;
use tauri::Manager;
use tauri::{App, AppHandle, Emitter, EventTarget, WebviewWindow};
use tauri_nspanel::{WebviewWindowExt, cocoa::appkit::NSWindowCollectionBehavior, panel_delegate};

use crate::common::MAIN_WINDOW_LABEL;

#[allow(non_upper_case_globals)]
const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;

const WINDOW_FOCUS_EVENT: &str = "tauri://focus";
const WINDOW_BLUR_EVENT: &str = "tauri://blur";
const WINDOW_MOVED_EVENT: &str = "tauri://move";
const WINDOW_RESIZED_EVENT: &str = "tauri://resize";

pub fn platform(
    _app: &mut App,
    main_window: WebviewWindow,
    _settings_window: WebviewWindow,
    _check_window: WebviewWindow,
) {
    // Convert ns_window to ns_panel
    let panel = main_window.to_panel().unwrap();

    // Make the window above the dock
    panel.set_level(20);

    // Do not steal focus from other windows
    panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel);

    // Share the window across all desktop spaces and full screen
    panel.set_collection_behaviour(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
    );

    // Define the panel's delegate to listen to panel window events
    let delegate = panel_delegate!(EcoPanelDelegate {
        window_did_become_key,
        window_did_resign_key,
        window_did_resize,
        window_did_move
    });

    // Set event listeners for the delegate
    delegate.set_listener(Box::new(move |delegate_name: String| {
        let target = EventTarget::labeled(MAIN_WINDOW_LABEL);

        let window_move_event = || {
            if let Ok(position) = main_window.outer_position() {
                let _ = main_window.emit_to(target.clone(), WINDOW_MOVED_EVENT, position);
            }
        };

        match delegate_name.as_str() {
            // Called when the window gets keyboard focus
            "window_did_become_key" => {
                let _ = main_window.emit_to(target, WINDOW_FOCUS_EVENT, true);
            }
            // Called when the window loses keyboard focus
            "window_did_resign_key" => {
                let _ = main_window.emit_to(target, WINDOW_BLUR_EVENT, true);
            }
            // Called when the window size changes
            "window_did_resize" => {
                window_move_event();

                if let Ok(size) = main_window.inner_size() {
                    let _ = main_window.emit_to(target, WINDOW_RESIZED_EVENT, size);
                }
            }
            // Called when the window position changes
            "window_did_move" => window_move_event(),
            _ => (),
        }
    }));

    // Set the delegate object for the window to handle window events
    panel.set_delegate(delegate);
}

/// Change NS window attribute between `NSWindowCollectionBehaviorCanJoinAllSpaces`
/// and `NSWindowCollectionBehaviorMoveToActiveSpace` accordingly.
///
/// NOTE: this tauri command is not async because we should run it in the main
/// thread, or `ns_window.setCollectionBehavior_(collection_behavior)` would lead
/// to UB.
#[tauri::command]
pub(crate) fn toggle_move_to_active_space_attribute(tauri_app_hanlde: AppHandle) {
    use cocoa::appkit::NSWindowCollectionBehavior;
    use cocoa::base::id;

    let main_window = tauri_app_hanlde
        .get_webview_window(MAIN_WINDOW_LABEL)
        .unwrap();
    let ns_window = main_window.ns_window().unwrap() as id;
    let mut collection_behavior = unsafe { ns_window.collectionBehavior() };
    let join_all_spaces = collection_behavior
        .contains(NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces);
    let move_to_active_space = collection_behavior
        .contains(NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace);

    match (join_all_spaces, move_to_active_space) {
        (true, false) => {
            collection_behavior
                .remove(NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces);
            collection_behavior
                .insert(NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace);
        }
        (false, true) => {
            collection_behavior
                .remove(NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace);
            collection_behavior
                .insert(NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces);
        }
        _ => {
            panic!(
                "invalid NS window attribute, NSWindowCollectionBehaviorCanJoinAllSpaces is set [{}], NSWindowCollectionBehaviorMoveToActiveSpace is set [{}]",
                join_all_spaces, move_to_active_space
            );
        }
    }

    unsafe {
        ns_window.setCollectionBehavior_(collection_behavior);
    }
}
