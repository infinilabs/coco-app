//! credits to: https://github.com/ayangweb/ayangweb-EcoPaste/blob/169323dbe6365ffe4abb64d867439ed2ea84c6d1/src-tauri/src/core/setup/mac.rs
//!
//! # allow(deprecated)
//!
//! This file uses some deprecated interfaces from the `tauri_nspanel` crate. The
//! only way to get rid of them is to bump that crate (v2->v2.1), we are not going
//! to do that because doing that bump requires a re-write of the code in this
//! file and v2 has been working well. So we allow these deprecated interfaces.

use crate::common::MAIN_WINDOW_LABEL;
use objc2_app_kit::NSNonactivatingPanelMask;
use tauri::{AppHandle, Emitter, EventTarget, WebviewWindow};
#[allow(deprecated)]
use tauri_nspanel::cocoa::appkit::NSWindowCollectionBehavior;
use tauri_nspanel::{WebviewWindowExt, panel_delegate};

const WINDOW_FOCUS_EVENT: &str = "tauri://focus";
const WINDOW_BLUR_EVENT: &str = "tauri://blur";
const WINDOW_MOVED_EVENT: &str = "tauri://move";
const WINDOW_RESIZED_EVENT: &str = "tauri://resize";

pub fn platform(
    _tauri_app_handle: &AppHandle,
    main_window: WebviewWindow,
    _settings_window: WebviewWindow,
    _check_window: WebviewWindow,
) {
    // Convert ns_window to ns_panel
    let panel = main_window.to_panel().unwrap();

    // Do not steal focus from other windows
    //
    // Cast is safe
    panel.set_style_mask(NSNonactivatingPanelMask.0 as i32);
    // Set its level to NSFloatingWindowLevel to ensure it appears in front of
    // all normal-level windows
    //
    // NOTE: some Chinese input methods use a level between NSDockWindowLevel (20)
    // and NSMainMenuWindowLevel (24), setting our level above NSDockWindowLevel
    // would block their window
    panel.set_floating_panel(true);

    // Open the window in the active workspace and full screen
    #[allow(deprecated)]
    panel.set_collection_behaviour(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
    );

    // Define the panel's delegate to listen to panel window events
    #[allow(deprecated)]
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
