//! This module calls macOS APIs to implement various helper functions needed by
//! to perform the defined actions.

mod private;

use std::ffi::c_uint;
use std::ffi::c_ushort;
use std::ffi::c_void;
use std::ops::Deref;
use std::ptr::NonNull;

use objc2::MainThreadMarker;
use objc2_app_kit::NSEvent;
use objc2_app_kit::NSScreen;
use objc2_app_kit::NSWorkspace;
use objc2_application_services::AXError;
use objc2_application_services::AXUIElement;
use objc2_application_services::AXValue;
use objc2_application_services::AXValueType;
use objc2_core_foundation::CFBoolean;
use objc2_core_foundation::CFRetained;
use objc2_core_foundation::CFString;
use objc2_core_foundation::CFType;
use objc2_core_foundation::CGPoint;
use objc2_core_foundation::CGRect;
use objc2_core_foundation::CGSize;
use objc2_core_foundation::Type;
use objc2_core_foundation::{CFArray, CFDictionary, CFNumber};
use objc2_core_graphics::CGError;
use objc2_core_graphics::CGEvent;
use objc2_core_graphics::CGEventFlags;
use objc2_core_graphics::CGEventTapLocation;
use objc2_core_graphics::CGEventType;
use objc2_core_graphics::CGMouseButton;
use objc2_core_graphics::CGRectGetMidX;
use objc2_core_graphics::CGRectGetMinY;
use objc2_core_graphics::CGWindowID;

use super::error::Error;

use private::CGSCopyManagedDisplaySpaces;
use private::CGSGetActiveSpace;
use private::CGSMainConnectionID;
use private::CGSSpaceID;
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

fn intersects(r1: CGRect, r2: CGRect) -> bool {
    let overlapping = !(r1.origin.x + r1.size.width < r2.origin.x
        || r1.origin.y + r1.size.height < r2.origin.y
        || r1.origin.x > r2.origin.x + r2.size.width
        || r1.origin.y > r2.origin.y + r2.size.height);

    overlapping
}

/// Core graphics APIs use flipped coordinate system, while AppKit uses the
/// unflippled version, they differ in the y-axis.  We need to do the conversion
/// (to `CGPoint.y`) manually.
fn flip_frame_y(main_screen_height: f64, frame_height: f64, frame_unflipped_y: f64) -> f64 {
    main_screen_height - (frame_unflipped_y + frame_height)
}

/// Helper function to extract an UI element's origin.
fn get_ui_element_origin(ui_element: &CFRetained<AXUIElement>) -> Result<CGPoint, Error> {
    let mut position_value: *const CFType = std::ptr::null();
    let ptr_to_position_value = NonNull::new(&mut position_value).unwrap();
    let position_attr = CFString::from_static_str("AXPosition");
    let error = unsafe { ui_element.copy_attribute_value(&position_attr, ptr_to_position_value) };

    if error != AXError::Success {
        return Err(Error::AXError(error));
    }
    assert!(!position_value.is_null());

    let position: CFRetained<AXValue> =
        unsafe { CFRetained::from_raw(NonNull::new(position_value.cast_mut().cast()).unwrap()) };

    let mut position_cg_point = CGPoint::ZERO;
    let ptr_to_position_cg_point =
        NonNull::new((&mut position_cg_point as *mut CGPoint).cast()).unwrap();

    let result = unsafe { position.value(AXValueType::CGPoint, ptr_to_position_cg_point) };
    assert!(result, "type mismatched");

    Ok(position_cg_point)
}

/// Helper function to extract an UI element's size.
fn get_ui_element_size(ui_element: &CFRetained<AXUIElement>) -> Result<CGSize, Error> {
    let mut size_value: *const CFType = std::ptr::null();
    let ptr_to_size_value = NonNull::new(&mut size_value).unwrap();
    let size_attr = CFString::from_static_str("AXSize");
    let error = unsafe { ui_element.copy_attribute_value(&size_attr, ptr_to_size_value) };

    if error != AXError::Success {
        return Err(Error::AXError(error));
    }
    assert!(!size_value.is_null());

    let size: CFRetained<AXValue> =
        unsafe { CFRetained::from_raw(NonNull::new(size_value.cast_mut().cast()).unwrap()) };

    let mut size_cg_size = CGSize::ZERO;
    let ptr_to_size_cg_size = NonNull::new((&mut size_cg_size as *mut CGSize).cast()).unwrap();

    let result = unsafe { size.value(AXValueType::CGSize, ptr_to_size_cg_size) };
    assert!(result, "type mismatched");

    Ok(size_cg_size)
}

/// Get the frontmost/focused window (as an UI element).
fn get_frontmost_window() -> Result<CFRetained<AXUIElement>, Error> {
    let workspace = unsafe { NSWorkspace::sharedWorkspace() };
    let frontmost_app =
        unsafe { workspace.frontmostApplication() }.ok_or(Error::CannotFindFocusWindow)?;

    let pid = unsafe { frontmost_app.processIdentifier() };

    let app_element = unsafe { AXUIElement::new_application(pid) };

    let mut window_element: *const CFType = std::ptr::null();
    let ptr_to_window_element = NonNull::new(&mut window_element).unwrap();
    let focused_window_attr = CFString::from_static_str("AXFocusedWindow");

    let error =
        unsafe { app_element.copy_attribute_value(&focused_window_attr, ptr_to_window_element) };

    if error != AXError::Success {
        return Err(Error::AXError(error));
    }
    assert!(!window_element.is_null());

    let window_element: *mut AXUIElement = window_element.cast::<AXUIElement>().cast_mut();

    let window = unsafe { CFRetained::from_raw(NonNull::new(window_element).unwrap()) };

    Ok(window)
}

/// Get the CGWindowID of the frontmost/focused window.
#[allow(unused)] // In case we need it in the future
pub(crate) fn get_frontmost_window_id() -> Result<CGWindowID, Error> {
    let element = get_frontmost_window()?;
    let ptr: NonNull<AXUIElement> = CFRetained::as_ptr(&element);

    let mut window_id_buffer: CGWindowID = 0;
    let error =
        unsafe { private::_AXUIElementGetWindow(ptr.as_ptr(), &mut window_id_buffer as *mut _) };
    if error != AXError::Success {
        return Err(Error::AXError(error));
    }

    Ok(window_id_buffer)
}

/// Returns the workspace ID list grouped by display.  For example, suppose you
/// have 2 displays and 10 workspaces (5 workspaces per display), then this
/// function might return something like:
///
/// ```text
/// [
///   [8, 11, 12, 13, 24],
///   [519, 77, 15, 249, 414]
/// ]
/// ```
///
/// Even though this function return macOS internal space IDs, they should correspond
/// to the logical workspace that users are familiar with.  The display that contains
/// workspaces `[8, 11, 12, 13, 24]` should be your main display; workspace 8 represents
/// Desktop 1, and workspace 414 represents Desktop 10.
fn workspace_ids_grouped_by_display() -> Vec<Vec<CGSSpaceID>> {
    unsafe {
        let mut ret = Vec::new();
        let conn = CGSMainConnectionID();

        let display_spaces_raw = CGSCopyManagedDisplaySpaces(conn);
        let display_spaces: CFRetained<CFArray> =
            CFRetained::from_raw(NonNull::new(display_spaces_raw).unwrap());

        let key_spaces: CFRetained<CFString> = CFString::from_static_str("Spaces");
        let key_spaces_ptr: NonNull<CFString> = CFRetained::as_ptr(&key_spaces);
        let key_id64: CFRetained<CFString> = CFString::from_static_str("id64");
        let key_id64_ptr: NonNull<CFString> = CFRetained::as_ptr(&key_id64);

        for i in 0..display_spaces.count() {
            let mut workspaces_of_this_display = Vec::new();

            let dict_ref = display_spaces.value_at_index(i);
            let dict: &CFDictionary = &*(dict_ref as *const CFDictionary);

            let mut ptr_to_value_buffer: *const c_void = std::ptr::null();
            let key_exists = dict.value_if_present(
                key_spaces_ptr.as_ptr().cast::<c_void>().cast_const(),
                &mut ptr_to_value_buffer as *mut _,
            );
            assert!(key_exists);
            assert!(!ptr_to_value_buffer.is_null());

            let spaces_raw: *const CFArray = ptr_to_value_buffer.cast::<CFArray>();

            let spaces = &*spaces_raw;

            for idx in 0..spaces.count() {
                let workspace_dictionary: &CFDictionary =
                    &*spaces.value_at_index(idx).cast::<CFDictionary>();

                let mut ptr_to_value_buffer: *const c_void = std::ptr::null();
                let key_exists = workspace_dictionary.value_if_present(
                    key_id64_ptr.as_ptr().cast::<c_void>().cast_const(),
                    &mut ptr_to_value_buffer as *mut _,
                );
                assert!(key_exists);
                assert!(!ptr_to_value_buffer.is_null());

                let ptr_workspace_id = ptr_to_value_buffer.cast::<CFNumber>();
                let workspace_id = (&*ptr_workspace_id).as_i32().unwrap();

                workspaces_of_this_display.push(workspace_id);
            }

            ret.push(workspaces_of_this_display);
        }

        ret
    }
}

/// Get the next workspace's logical ID.  By logical ID, we mean the ID that
/// users are familiar with, workspace 1/2/3 and so on, rather than the internal
/// `CGSSpaceID`.
///
/// NOTE that this function returns None when the current workspace is the last
/// workspace in the current display.
pub(crate) fn get_next_workspace_logical_id() -> Option<usize> {
    let window_server_connection = unsafe { CGSMainConnectionID() };
    let current_workspace_id = unsafe { CGSGetActiveSpace(window_server_connection) };

    // Logical ID starts from 1
    let mut logical_id = 1_usize;

    for workspaces_in_a_display in workspace_ids_grouped_by_display() {
        for (idx, workspace_raw_id) in workspaces_in_a_display.iter().enumerate() {
            if *workspace_raw_id == current_workspace_id {
                // We found it, now check if it is the last workspace in this display
                if idx == workspaces_in_a_display.len() - 1 {
                    return None;
                } else {
                    return Some(logical_id + 1);
                }
            } else {
                logical_id += 1;
                continue;
            }
        }
    }

    unreachable!(
        "unless the private API CGSGetActiveSpace() is broken, it should return an ID that is in the workspace ID list"
    )
}

/// Get the previous workspace's logical ID.
///
/// See [`get_next_workspace_logical_id`] for the doc.
pub(crate) fn get_previous_workspace_logical_id() -> Option<usize> {
    let window_server_connection = unsafe { CGSMainConnectionID() };
    let current_workspace_id = unsafe { CGSGetActiveSpace(window_server_connection) };

    // Logical ID starts from 1
    let mut logical_id = 1_usize;

    for workspaces_in_a_display in workspace_ids_grouped_by_display() {
        for (idx, workspace_raw_id) in workspaces_in_a_display.iter().enumerate() {
            if *workspace_raw_id == current_workspace_id {
                // We found it, now check if it is the first workspace in this display
                if idx == 0 {
                    return None;
                } else {
                    // this sub operation is safe, logical_id is at least 2
                    return Some(logical_id - 1);
                }
            } else {
                logical_id += 1;
                continue;
            }
        }
    }

    unreachable!(
        "unless the private API CGSGetActiveSpace() is broken, it should return an ID that is in the workspace ID list"
    )
}

/// Move the frontmost window to the specified workspace.
///
/// Credits to the Silica library
///
/// * https://github.com/ianyh/Silica/blob/b91a18dbb822e99ce6b487d1cb4841e863139b2a/Silica/Sources/SIWindow.m#L215-L260
/// * https://github.com/ianyh/Silica/blob/b91a18dbb822e99ce6b487d1cb4841e863139b2a/Silica/Sources/SISystemWideElement.m#L29-L65
pub(crate) fn move_frontmost_window_to_workspace(space: usize) -> Result<(), Error> {
    assert!(space >= 1);
    if space > 16 {
        return Err(Error::TooManyWorkspace);
    }

    let window_frame = get_frontmost_window_frame()?;
    let close_button_frame = get_frontmost_window_close_button_frame()?;

    let mouse_cursor_point = CGPoint::new(
        unsafe { CGRectGetMidX(close_button_frame) },
        window_frame.origin.y
            + (window_frame.origin.y - unsafe { CGRectGetMinY(close_button_frame) }).abs() / 2.0,
    );

    let mouse_move_event = unsafe {
        CGEvent::new_mouse_event(
            None,
            CGEventType::MouseMoved,
            mouse_cursor_point,
            CGMouseButton::Left,
        )
    };
    let mouse_drag_event = unsafe {
        CGEvent::new_mouse_event(
            None,
            CGEventType::LeftMouseDragged,
            mouse_cursor_point,
            CGMouseButton::Left,
        )
    };
    let mouse_down_event = unsafe {
        CGEvent::new_mouse_event(
            None,
            CGEventType::LeftMouseDown,
            mouse_cursor_point,
            CGMouseButton::Left,
        )
    };
    let mouse_up_event = unsafe {
        CGEvent::new_mouse_event(
            None,
            CGEventType::LeftMouseUp,
            mouse_cursor_point,
            CGMouseButton::Left,
        )
    };

    unsafe {
        CGEvent::set_flags(mouse_move_event.as_deref(), CGEventFlags(0));
        CGEvent::set_flags(mouse_down_event.as_deref(), CGEventFlags(0));
        CGEvent::set_flags(mouse_up_event.as_deref(), CGEventFlags(0));

        // Move the mouse into place at the window's toolbar
        CGEvent::post(CGEventTapLocation::HIDEventTap, mouse_move_event.as_deref());
        // Mouse down to set up the drag
        CGEvent::post(CGEventTapLocation::HIDEventTap, mouse_down_event.as_deref());
        // Drag event to grab hold of the window
        CGEvent::post(CGEventTapLocation::HIDEventTap, mouse_drag_event.as_deref());
    }

    // cast is safe as space is in range [1, 16]
    let hot_key: c_ushort = 118 + space as c_ushort - 1;

    let mut flags: c_uint = 0;
    let mut key_code: c_ushort = 0;
    let error = unsafe {
        private::CGSGetSymbolicHotKeyValue(hot_key, std::ptr::null_mut(), &mut key_code, &mut flags)
    };
    if error != CGError::Success {
        return Err(Error::CGError(error));
    }

    unsafe {
        // If the hotkey is disabled, enable it.
        if !private::CGSIsSymbolicHotKeyEnabled(hot_key) {
            if private::CGSSetSymbolicHotKeyEnabled(hot_key, true) != CGError::Success {
                return Err(Error::CGError(error));
            }
        }
    }

    let opt_keyboard_event = unsafe { CGEvent::new_keyboard_event(None, key_code, true) };
    unsafe {
        // cast is safe (uint -> u64)
        CGEvent::set_flags(opt_keyboard_event.as_deref(), CGEventFlags(flags as u64));
    }

    let keyboard_event = opt_keyboard_event.unwrap();
    let event = unsafe { NSEvent::eventWithCGEvent(&keyboard_event) }.unwrap();

    let keyboard_event_up = unsafe { CGEvent::new_keyboard_event(None, event.keyCode(), false) };
    unsafe {
        CGEvent::set_flags(keyboard_event_up.as_deref(), CGEventFlags(0));

        // Send the shortcut command to get Mission Control to switch spaces from under the window.
        CGEvent::post(CGEventTapLocation::HIDEventTap, event.CGEvent().as_deref());
        CGEvent::post(
            CGEventTapLocation::HIDEventTap,
            keyboard_event_up.as_deref(),
        );
    }

    unsafe {
        // Let go of the window.
        CGEvent::post(CGEventTapLocation::HIDEventTap, mouse_up_event.as_deref());
    }

    Ok(())
}

pub(crate) fn get_frontmost_window_origin() -> Result<CGPoint, Error> {
    let frontmost_window = get_frontmost_window()?;
    get_ui_element_origin(&frontmost_window)
}

pub(crate) fn get_frontmost_window_size() -> Result<CGSize, Error> {
    let frontmost_window = get_frontmost_window()?;
    get_ui_element_size(&frontmost_window)
}

pub(crate) fn get_frontmost_window_frame() -> Result<CGRect, Error> {
    let origin = get_frontmost_window_origin()?;
    let size = get_frontmost_window_size()?;

    Ok(CGRect { origin, size })
}

/// Get the frontmost window's close button, then extract its frame.
fn get_frontmost_window_close_button_frame() -> Result<CGRect, Error> {
    let window = get_frontmost_window()?;

    let mut ptr_to_close_button: *const CFType = std::ptr::null();
    let ptr_to_buffer = NonNull::new(&mut ptr_to_close_button).unwrap();

    let close_button_attribute = CFString::from_static_str("AXCloseButton");
    let error = unsafe { window.copy_attribute_value(&close_button_attribute, ptr_to_buffer) };
    if error != AXError::Success {
        return Err(Error::AXError(error));
    }
    assert!(!ptr_to_close_button.is_null());

    let close_button_element = ptr_to_close_button.cast::<AXUIElement>().cast_mut();
    let close_button = unsafe { CFRetained::from_raw(NonNull::new(close_button_element).unwrap()) };

    let origin = get_ui_element_origin(&close_button)?;
    let size = get_ui_element_size(&close_button)?;

    Ok(CGRect { origin, size })
}

/// This function returns the "visible frame" [^1] of all the screens.
///
/// FIXME: This function relies on the [`visibleFrame()`][vf_doc] API, which
/// has 2 bugs we need to work around:
///
/// 1. It assumes the Dock is on the main display, which in reality depends on
///    how users arrange their displays and the "Dock position on screen" setting
///    entry.
/// 2. For non-main displays, it assumes that they don't have a menu bar, but macOS
///    puts a menu bar on every display.
///
///
/// [^1]: Visible frame: a rectangle defines the portion of the screen in which it
///      is currently safe to draw your app’s content.
///
/// [vf_doc]: https://developer.apple.com/documentation/AppKit/NSScreen/visibleFrame
pub(crate) fn list_visible_frame_of_all_screens() -> Result<Vec<CGRect>, Error> {
    let main_thread_marker = MainThreadMarker::new().ok_or(Error::NotInMainThread)?;
    let screens = NSScreen::screens(main_thread_marker).to_vec();

    if screens.is_empty() {
        return Ok(Vec::new());
    }

    let main_screen = screens.first().expect("screens is not empty");

    let frames = screens
        .iter()
        .map(|ns_screen| {
            // NSScreen is an AppKit API, which uses unflipped coordinate
            // system, flip it
            let mut unflipped_frame = ns_screen.visibleFrame();
            let flipped_frame_origin_y = flip_frame_y(
                main_screen.frame().size.height,
                unflipped_frame.size.height,
                unflipped_frame.origin.y,
            );
            unflipped_frame.origin.y = flipped_frame_origin_y;

            unflipped_frame
        })
        .collect();

    Ok(frames)
}

/// Get the Visible frame of the "active screen"[^1].
///
///
/// [^1]: the screen which the frontmost window is on.
pub(crate) fn get_active_screen_visible_frame() -> Result<CGRect, Error> {
    let main_thread_marker = MainThreadMarker::new().ok_or(Error::NotInMainThread)?;

    let frontmost_window_frame = get_frontmost_window_frame()?;

    let screens = NSScreen::screens(main_thread_marker)
        .into_iter()
        .collect::<Vec<_>>();

    if screens.is_empty() {
        return Err(Error::NoDisplay);
    }

    let main_screen_height = screens[0].frame().size.height;

    // AppKit uses Unflipped Coordinate System, but Accessibility APIs use
    // Flipped Coordinate System, we need to flip the origin of these screens.
    for screen in screens {
        let mut screen_frame = screen.frame();
        let unflipped_y = screen_frame.origin.y;
        let flipped_y = flip_frame_y(main_screen_height, screen_frame.size.height, unflipped_y);
        screen_frame.origin.y = flipped_y;

        if intersects(screen_frame, frontmost_window_frame) {
            let mut visible_frame = screen.visibleFrame();
            let flipped_y = flip_frame_y(
                main_screen_height,
                visible_frame.size.height,
                visible_frame.origin.y,
            );
            visible_frame.origin.y = flipped_y;

            return Ok(visible_frame);
        }
    }

    unreachable!()
}

/// Move the frontmost window's origin to the point specified by `x` and `y`.
pub fn move_frontmost_window(x: f64, y: f64) -> Result<(), Error> {
    let frontmost_window = get_frontmost_window()?;

    let mut point = CGPoint::new(x, y);
    let ptr_to_point = NonNull::new((&mut point as *mut CGPoint).cast::<c_void>()).unwrap();
    let pos_value = unsafe { AXValue::new(AXValueType::CGPoint, ptr_to_point) }.unwrap();
    let pos_attr = CFString::from_static_str("AXPosition");

    let error = unsafe { frontmost_window.set_attribute_value(&pos_attr, pos_value.deref()) };
    if error != AXError::Success {
        return Err(Error::AXError(error));
    }

    Ok(())
}

/// Set the frontmost window's frame to the specified frame - adjust size and
/// location at the same time.
pub fn set_frontmost_window_frame(frame: CGRect) -> Result<(), Error> {
    let frontmost_window = get_frontmost_window()?;

    let mut point = frame.origin;
    let ptr_to_point = NonNull::new((&mut point as *mut CGPoint).cast::<c_void>()).unwrap();
    let pos_value = unsafe { AXValue::new(AXValueType::CGPoint, ptr_to_point) }.unwrap();
    let pos_attr = CFString::from_static_str("AXPosition");

    let error = unsafe { frontmost_window.set_attribute_value(&pos_attr, pos_value.deref()) };
    if error != AXError::Success {
        return Err(Error::AXError(error));
    }

    let mut size = frame.size;
    let ptr_to_size = NonNull::new((&mut size as *mut CGSize).cast::<c_void>()).unwrap();
    let size_value = unsafe { AXValue::new(AXValueType::CGSize, ptr_to_size) }.unwrap();
    let size_attr = CFString::from_static_str("AXSize");

    let error = unsafe { frontmost_window.set_attribute_value(&size_attr, size_value.deref()) };
    if error != AXError::Success {
        return Err(Error::AXError(error));
    }

    Ok(())
}

pub fn toggle_fullscreen() -> Result<(), Error> {
    let frontmost_window = get_frontmost_window()?;
    let fullscreen_attr = CFString::from_static_str("AXFullScreen");

    let mut current_value_ref: *const CFType = std::ptr::null();
    let error = unsafe {
        frontmost_window.copy_attribute_value(
            &fullscreen_attr,
            NonNull::new(&mut current_value_ref).unwrap(),
        )
    };

    // TODO: If the attribute doesn't exist, error won't be Success as well.
    // Before we handle that, we need to know the error case that will be
    // returned in that case.
    if error != AXError::Success {
        return Err(Error::AXError(error));
    }
    assert!(!current_value_ref.is_null());

    let current_value = unsafe {
        let retained_boolean: CFRetained<CFBoolean> = CFRetained::from_raw(
            NonNull::new(current_value_ref.cast::<CFBoolean>().cast_mut()).unwrap(),
        );
        retained_boolean.as_bool()
    };

    let new_value = !current_value;
    let new_value_ref: CFRetained<CFBoolean> = CFBoolean::new(new_value).retain();

    let error =
        unsafe { frontmost_window.set_attribute_value(&fullscreen_attr, new_value_ref.deref()) };

    if error != AXError::Success {
        return Err(Error::AXError(error));
    }

    Ok(())
}

static LAST_FRAME: LazyLock<Mutex<HashMap<CGWindowID, CGRect>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

pub(crate) fn set_frontmost_window_last_frame(window_id: CGWindowID, frame: CGRect) {
    let mut map = LAST_FRAME.lock().unwrap();
    map.insert(window_id, frame);
}

pub(crate) fn get_frontmost_window_last_frame(window_id: CGWindowID) -> Option<CGRect> {
    let map = LAST_FRAME.lock().unwrap();
    map.get(&window_id).cloned()
}
