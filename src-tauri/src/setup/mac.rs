//credits to: https://github.com/ayangweb/ayangweb-EcoPaste/blob/169323dbe6365ffe4abb64d867439ed2ea84c6d1/src-tauri/src/core/setup/mac.rs
use tauri::{ActivationPolicy, App, Emitter, Manager, WebviewWindow};
use tauri_nspanel::{
    cocoa::appkit::{NSMainMenuWindowLevel, NSWindowCollectionBehavior},
    panel_delegate, WebviewWindowExt,
};

#[allow(non_upper_case_globals)]
const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;
#[allow(non_upper_case_globals)]
const NSResizableWindowMask: i32 = 1 << 3;
const MACOS_PANEL_FOCUS: &str = "macos-panel-focus";

pub fn platform(app: &mut App, main_window: WebviewWindow, _settings_window: WebviewWindow) {
    let app_handle = app.app_handle().clone();

    app.set_activation_policy(ActivationPolicy::Accessory);

    // Convert ns_window to ns_panel
    let panel = main_window.to_panel().unwrap();

    // Make the window above the dock
    panel.set_level(NSMainMenuWindowLevel + 1);

    // Do not steal focus from other windows and support resizing
    panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel | NSResizableWindowMask);

    // Share the window across all desktop spaces and full screen
    panel.set_collection_behaviour(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
    );

    // Define the panel's delegate to listen to panel window events
    let delegate = panel_delegate!(EcoPanelDelegate {
        window_did_become_key,
        window_did_resign_key
    });

    // Set event listeners for the delegate
    delegate.set_listener(Box::new(move |delegate_name: String| {
        match delegate_name.as_str() {
            // Called when the window gains keyboard focus
            "window_did_become_key" => {
                app_handle.emit(MACOS_PANEL_FOCUS, true).unwrap();
            }
            // Called when the window loses keyboard focus
            "window_did_resign_key" => {
                app_handle.emit(MACOS_PANEL_FOCUS, false).unwrap();
            }
            _ => (),
        }
    }));

    // Set the delegate object for the window to handle window events
    panel.set_delegate(delegate);
}