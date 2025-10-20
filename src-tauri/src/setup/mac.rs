//! credits to: https://github.com/ayangweb/ayangweb-EcoPaste/blob/169323dbe6365ffe4abb64d867439ed2ea84c6d1/src-tauri/src/core/setup/mac.rs

use crate::common::MAIN_WINDOW_LABEL;
use tauri::{AppHandle, Emitter, EventTarget, Manager, WebviewWindow};
use tauri_nspanel::{CollectionBehavior, PanelLevel, StyleMask, WebviewWindowExt, tauri_panel};

const WINDOW_FOCUS_EVENT: &str = "tauri://focus";
const WINDOW_BLUR_EVENT: &str = "tauri://blur";

tauri_panel! {
    panel!(NsPanel {
        config: {
            is_floating_panel: true,
            can_become_key_window: true,
            can_become_main_window: false
        }
    })

    panel_event!(NsPanelEventHandler {
        window_did_become_key(notification: &NSNotification) -> (),
        window_did_resign_key(notification: &NSNotification) -> (),
    })
}

pub fn platform(
    _tauri_app_handle: &AppHandle,
    main_window: WebviewWindow,
    _settings_window: WebviewWindow,
    _check_window: WebviewWindow,
) {
    // Convert ns_window to ns_panel
    let panel = main_window.to_panel::<NsPanel>().unwrap();

    // set level
    panel.set_level(PanelLevel::Utility.value());

    // Do not steal focus from other windows
    panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());

    // Open the window in the active workspace and full screen
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .stationary()
            .move_to_active_space()
            .full_screen_auxiliary()
            .into(),
    );

    let handler = NsPanelEventHandler::new();

    let window = main_window.clone();
    handler.window_did_become_key(move |_| {
        let target = EventTarget::labeled(MAIN_WINDOW_LABEL);

        let _ = window.emit_to(target, WINDOW_FOCUS_EVENT, true);
    });

    let window = main_window.clone();
    handler.window_did_resign_key(move |_| {
        let target = EventTarget::labeled(MAIN_WINDOW_LABEL);

        let _ = window.emit_to(target, WINDOW_BLUR_EVENT, true);
    });

    // Set the delegate object for the window to handle window events
    panel.set_event_handler(Some(handler.as_ref()));
}
