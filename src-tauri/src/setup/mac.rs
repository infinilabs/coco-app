//credits to: https://github.com/ayangweb/ayangweb-EcoPaste/blob/169323dbe6365ffe4abb64d867439ed2ea84c6d1/src-tauri/src/core/setup/mac.rs
use tauri::{ActivationPolicy, App, Emitter, EventTarget, WebviewWindow};
use tauri_nspanel::{
    cocoa::appkit::{NSMainMenuWindowLevel, NSWindowCollectionBehavior},
    panel_delegate, WebviewWindowExt,
};

use crate::common::MAIN_WINDOW_LABEL;

#[allow(non_upper_case_globals)]
const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;

const WINDOW_FOCUS_EVENT: &str = "tauri://focus";
const WINDOW_BLUR_EVENT: &str = "tauri://blur";
const WINDOW_MOVED_EVENT: &str = "tauri://move";
const WINDOW_RESIZED_EVENT: &str = "tauri://resize";

pub fn platform(app: &mut App, main_window: WebviewWindow, _settings_window: WebviewWindow) {
    app.set_activation_policy(ActivationPolicy::Accessory);

    // Convert ns_window to ns_panel
    let panel = main_window.to_panel().unwrap();

    // Make the window above the dock
    panel.set_level(20);

    // Do not steal focus from other windows
    panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel);

    // Share the window across all desktop spaces and full screen
    panel.set_collection_behaviour(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
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
