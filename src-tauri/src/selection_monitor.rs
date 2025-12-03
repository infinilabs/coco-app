/// Event payload sent to the frontend when selection is detected.
/// Coordinates use logical (Quartz) points with a top-left origin.
/// Note: `y` is flipped on the backend to match the frontend’s usage.
use tauri::Emitter;

#[derive(serde::Serialize, Clone)]
struct SelectionEventPayload {
    text: String,
    x: i32,
    y: i32,
}

use once_cell::sync::Lazy;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

/// Global toggle: selection monitoring enabled by default.
static SELECTION_ENABLED: AtomicBool = AtomicBool::new(true);

/// Session flags for controlling macOS Accessibility prompts.
#[cfg(target_os = "macos")]
static SEEN_ACCESSIBILITY_TRUSTED_ONCE: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "macos")]
static LAST_ACCESSIBILITY_PROMPT: Lazy<Mutex<Option<std::time::Instant>>> =
    Lazy::new(|| Mutex::new(None));

#[derive(serde::Serialize, Clone)]
struct SelectionEnabledPayload {
    enabled: bool,
}

/// Read the current selection monitoring state.
pub fn is_selection_enabled() -> bool {
    SELECTION_ENABLED.load(Ordering::Relaxed)
}

/// Update the monitoring state and broadcast to the frontend.
fn set_selection_enabled_internal(app_handle: &tauri::AppHandle, enabled: bool) {
    SELECTION_ENABLED.store(enabled, Ordering::Relaxed);
    let _ = app_handle.emit("selection-enabled", SelectionEnabledPayload { enabled });
}

/// Tauri command: set selection monitoring state.
#[tauri::command]
pub fn set_selection_enabled(app_handle: tauri::AppHandle, enabled: bool) {
    set_selection_enabled_internal(&app_handle, enabled);

    // When enabling selection monitoring on macOS, ensure Accessibility permission.
    // If not granted, trigger system prompt and deep-link to the right settings pane,
    // and notify frontend to guide the user.
    #[cfg(target_os = "macos")]
    {
        if enabled {
            let _ = ensure_accessibility_permission(&app_handle);
        }
    }
}

/// Tauri command: get selection monitoring state.
#[tauri::command]
pub fn get_selection_enabled() -> bool {
    is_selection_enabled()
}

#[cfg(target_os = "macos")]
pub fn start_selection_monitor(app_handle: tauri::AppHandle) {
    // Entrypoint: checks permissions (macOS), initializes, and starts a background watcher thread.
    // log::info!("start_selection_monitor: entrypoint");
    use std::time::Duration;
    use tauri::Emitter;

    // Sync initial enabled state to the frontend on startup.
    set_selection_enabled_internal(&app_handle, is_selection_enabled());

    // Accessibility permission is required to read selected text in the foreground app.
    // If not granted, prompt the user once; if still not granted, skip starting the watcher.
    #[cfg(target_os = "macos")]
    {
        if !ensure_accessibility_permission(&app_handle) {
            return;
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        log::info!("start_selection_monitor: non-macos platform, no selection monitor");
    }

    // Background thread: drives popup show/hide based on mouse and AX selection state.
    std::thread::spawn(move || {
        #[cfg(target_os = "macos")]
        use objc2_app_kit::NSWorkspace;
        use objc2_core_graphics::CGEvent;
        use objc2_core_graphics::{CGDisplayBounds, CGGetActiveDisplayList, CGMainDisplayID};

        // Get current mouse position (logical top-left origin), flipping `y` to match frontend usage.
        let current_mouse_point_global = || -> (i32, i32) {
            unsafe {
                let event = CGEvent::new(None);
                let pt = objc2_core_graphics::CGEvent::location(event.as_deref());

                // Enumerate active displays to compute global bounds and pick the display containing the cursor.
                let mut displays: [u32; 16] = [0; 16];
                let mut display_count: u32 = 0;
                let _ = CGGetActiveDisplayList(
                    displays.len() as u32,
                    displays.as_mut_ptr(),
                    &mut display_count,
                );
                if display_count == 0 {
                    // Fallback to main display.
                    let did = CGMainDisplayID();
                    let b = CGDisplayBounds(did);
                    let min_x_pt = b.origin.x as f64;
                    let max_top_pt = (b.origin.y + b.size.height) as f64;
                    let min_bottom_pt = b.origin.y as f64;
                    let total_h_pt = max_top_pt - min_bottom_pt;

                    let x_top_left = (pt.x as f64 - min_x_pt).round() as i32;
                    let y_top_left = (max_top_pt - pt.y as f64).round() as i32;
                    let y_flipped = (total_h_pt.round() as i32 - y_top_left).max(0);

                    return (x_top_left, y_flipped);
                }

                let mut _chosen = CGMainDisplayID(); // default fallback
                // log::info!(
                //     "current_mouse: pt=({:.1},{:.1}) → display={}",
                //     pt.x as f64,
                //     pt.y as f64,
                //     chosen
                // );

                let mut min_x_pt = f64::INFINITY;
                let mut max_top_pt = f64::NEG_INFINITY;
                let mut min_bottom_pt = f64::INFINITY;
                for i in 0..display_count as usize {
                    let did = displays[i];
                    let b = CGDisplayBounds(did);
                    if (b.origin.x as f64) < min_x_pt {
                        min_x_pt = b.origin.x as f64;
                    }
                    let top = (b.origin.y + b.size.height) as f64;
                    if top > max_top_pt {
                        max_top_pt = top;
                    }
                    if (b.origin.y as f64) < min_bottom_pt {
                        min_bottom_pt = b.origin.y as f64;
                    }

                    let in_x = pt.x >= b.origin.x && pt.x <= b.origin.x + b.size.width;
                    let in_y = pt.y >= b.origin.y && pt.y <= b.origin.y + b.size.height;
                    if in_x && in_y {
                        _chosen = did;
                        // log::info!(
                        //     "current_mouse: pt=({:.1},{:.1}) → display={} → point_global_top_left=(x={}, y={})",
                        //     pt.x as f64,
                        //     pt.y as f64,
                        //     chosen,
                        //     b.origin.x,
                        //     b.origin.y
                        // );
                    }
                }

                let total_h_pt = max_top_pt - min_bottom_pt;

                let x_top_left = (pt.x as f64 - min_x_pt).round() as i32;
                let y_top_left = (max_top_pt - pt.y as f64).round() as i32;
                let y_flipped = (total_h_pt.round() as i32 - y_top_left).max(0);

                (x_top_left, y_flipped)
            }
        };

        // Determine whether the frontmost app is this process (Coco).
        // Avoid misinterpreting empty selection when interacting with the popup itself.
        let is_frontmost_app_me = || -> bool {
            #[cfg(target_os = "macos")]
            unsafe {
                let workspace = NSWorkspace::sharedWorkspace();
                if let Some(frontmost) = workspace.frontmostApplication() {
                    let pid = frontmost.processIdentifier();
                    let my_pid = std::process::id() as i32;
                    return pid == my_pid;
                }
            }
            false
        };

        // Selection-driven state machine.
        let mut popup_visible = false;
        let mut last_text = String::new();

        // Stability and hide thresholds (tunable).
        let stable_threshold = 2; // same content ≥2 times → stable selection
        let empty_threshold = 2; // empty value ≥2 times → stable empty
        let mut stable_text = String::new();
        let mut stable_count = 0;
        let mut empty_count = 0;

        loop {
            std::thread::sleep(Duration::from_millis(30));

            // If disabled: do not read AX / do not show popup; hide if currently visible.
            if !is_selection_enabled() {
                if popup_visible {
                    let _ = app_handle.emit("selection-detected", "");
                    popup_visible = false;
                    last_text.clear();
                    stable_text.clear();
                }
                continue;
            }

            // Skip empty-selection hide checks while interacting with the Coco popup.
            // Robust check: treat as "self" if either the frontmost app or the
            // system-wide focused element belongs to this process.
            let front_is_me = is_frontmost_app_me() || is_focused_element_me();

            // When Coco is frontmost, disable detection but do NOT hide the popup.
            // Users may be clicking the popup; we must keep it visible.
            if front_is_me {
                // Reset counters to avoid stale state on re-entry.
                stable_count = 0;
                empty_count = 0;
                continue;
            }

            // Lightweight retries to smooth out transient AX focus instability.
            let selected_text = {
                // Up to 2 retries, 35ms apart.
                read_selected_text_with_retries(2, 35)
            };

            match selected_text {
                Some(text) if !text.is_empty() => {
                    empty_count = 0;
                    if text == stable_text {
                        stable_count += 1;
                    } else {
                        stable_text = text.clone();
                        stable_count = 1;
                    }

                    // Update/show only when selection is stable to avoid flicker.
                    if stable_count >= stable_threshold {
                        if !popup_visible || text != last_text {
                            // Second guard: do not emit when Coco is frontmost
                            // or the system-wide focused element belongs to Coco.
                            // Keep popup as-is to allow user interaction.
                            if is_frontmost_app_me() || is_focused_element_me() {
                                stable_count = 0;
                                empty_count = 0;
                                continue;
                            }
                            let (x, y) = current_mouse_point_global();
                            let payload = SelectionEventPayload {
                                text: text.clone(),
                                x,
                                y,
                            };

                            let _ = app_handle.emit("selection-detected", payload);
                            last_text = text;
                            popup_visible = true;
                        }
                    }
                }
                _ => {
                    // If not Coco in front and selection is empty: accumulate empties, then hide.
                    if !front_is_me {
                        stable_count = 0;
                        empty_count += 1;
                        if popup_visible && empty_count >= empty_threshold {
                            let _ = app_handle.emit("selection-detected", "");
                            popup_visible = false;
                            last_text.clear();
                            stable_text.clear();
                        }
                    } else {
                        // When Coco is frontmost: do not hide or clear state during interaction.
                    }
                }
            }
        }
    });
}

/// Ensure macOS Accessibility permission with double-checking and session throttling.
/// Returns true when trusted; otherwise triggers prompt/settings link and emits
/// `selection-permission-required` to the frontend, then returns false.
#[cfg(target_os = "macos")]
fn ensure_accessibility_permission(app_handle: &tauri::AppHandle) -> bool {
    use std::time::{Duration, Instant};

    // First check — fast path.
    let trusted = macos_accessibility_client::accessibility::application_is_trusted();
    if trusted {
        SEEN_ACCESSIBILITY_TRUSTED_ONCE.store(true, Ordering::Relaxed);
        return true;
    }

    // If we've seen trust earlier in this session, transient false may occur.
    // Re-check after a short delay to avoid spurious prompts.
    if SEEN_ACCESSIBILITY_TRUSTED_ONCE.load(Ordering::Relaxed) {
        std::thread::sleep(Duration::from_millis(150));
        if macos_accessibility_client::accessibility::application_is_trusted() {
            return true;
        }
    }

    // Throttle system prompt to at most once per 60s in this session.
    let mut last = LAST_ACCESSIBILITY_PROMPT.lock().unwrap();
    let now = Instant::now();
    let allow_prompt = match *last {
        Some(ts) => now.duration_since(ts) > Duration::from_secs(60),
        None => true,
    };

    if allow_prompt {
        // Try to trigger the system authorization prompt.
        let _ = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        *last = Some(now);

        // Small grace period then re-check.
        std::thread::sleep(Duration::from_millis(150));
        if macos_accessibility_client::accessibility::application_is_trusted() {
            SEEN_ACCESSIBILITY_TRUSTED_ONCE.store(true, Ordering::Relaxed);
            return true;
        }
    }

    // Still not trusted — notify frontend and deep-link to settings.
    let _ = app_handle.emit("selection-permission-required", true);
    #[allow(unused_must_use)]
    {
        use std::process::Command;
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .status();
    }

    false
}

// macOS-wide accessibility entry point: allows reading system-level focused elements.
#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn AXUIElementCreateSystemWide() -> *mut objc2_application_services::AXUIElement;
}

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn AXUIElementGetPid(
        element: *mut objc2_application_services::AXUIElement,
        pid: *mut i32,
    ) -> objc2_application_services::AXError;
}

#[cfg(target_os = "macos")]
fn is_focused_element_me() -> bool {
    use objc2_application_services::{AXError, AXUIElement};
    use objc2_core_foundation::{CFRetained, CFString, CFType};
    use std::ptr::NonNull;

    let mut focused_ui_ptr: *const CFType = std::ptr::null();
    let focused_attr = CFString::from_static_str("AXFocusedUIElement");

    let system_elem = unsafe { AXUIElementCreateSystemWide() };
    if system_elem.is_null() {
        return false;
    }

    let system_elem_retained: CFRetained<AXUIElement> =
        unsafe { CFRetained::from_raw(NonNull::new(system_elem).unwrap()) };
    let err = unsafe {
        system_elem_retained
            .copy_attribute_value(&focused_attr, NonNull::new(&mut focused_ui_ptr).unwrap())
    };
    if err != AXError::Success || focused_ui_ptr.is_null() {
        return false;
    }

    let focused_ui_elem: *mut AXUIElement = focused_ui_ptr.cast::<AXUIElement>().cast_mut();
    let mut pid: i32 = -1;
    let get_err = unsafe { AXUIElementGetPid(focused_ui_elem, &mut pid as *mut i32) };
    if get_err != AXError::Success {
        return false;
    }

    let my_pid = std::process::id() as i32;
    pid == my_pid
}

/// Read the selected text of the frontmost application (without using the clipboard).
/// macOS only. Returns `None` when the frontmost app is Coco to avoid false empties.
#[cfg(target_os = "macos")]
fn read_selected_text() -> Option<String> {
    use objc2_app_kit::NSWorkspace;
    use objc2_application_services::{AXError, AXUIElement};
    use objc2_core_foundation::{CFRetained, CFString, CFType};
    use std::ptr::NonNull;

    // Prefer system-wide focused element; if unavailable, fall back to app/window focused element.
    let mut focused_ui_ptr: *const CFType = std::ptr::null();
    let focused_attr = CFString::from_static_str("AXFocusedUIElement");

    // System-wide focused UI element.
    let system_elem = unsafe { AXUIElementCreateSystemWide() };
    if !system_elem.is_null() {
        let system_elem_retained: CFRetained<AXUIElement> =
            unsafe { CFRetained::from_raw(NonNull::new(system_elem).unwrap()) };
        let err = unsafe {
            system_elem_retained
                .copy_attribute_value(&focused_attr, NonNull::new(&mut focused_ui_ptr).unwrap())
        };
        if err != AXError::Success {
            focused_ui_ptr = std::ptr::null();
        }
    }

    // Fallback to the frontmost app's focused/window element.
    if focused_ui_ptr.is_null() {
        let workspace = unsafe { NSWorkspace::sharedWorkspace() };
        let frontmost_app = unsafe { workspace.frontmostApplication() }?;
        let pid = unsafe { frontmost_app.processIdentifier() };

        // Skip if frontmost is Coco (this process).
        let my_pid = std::process::id() as i32;
        if pid == my_pid {
            return None;
        }

        let app_element = unsafe { AXUIElement::new_application(pid) };
        let err = unsafe {
            app_element
                .copy_attribute_value(&focused_attr, NonNull::new(&mut focused_ui_ptr).unwrap())
        };
        if err != AXError::Success || focused_ui_ptr.is_null() {
            // Try `AXFocusedWindow` as a lightweight fallback.
            let mut focused_window_ptr: *const CFType = std::ptr::null();
            let focused_window_attr = CFString::from_static_str("AXFocusedWindow");
            let w_err = unsafe {
                app_element.copy_attribute_value(
                    &focused_window_attr,
                    NonNull::new(&mut focused_window_ptr).unwrap(),
                )
            };
            if w_err != AXError::Success || focused_window_ptr.is_null() {
                return None;
            }
            focused_ui_ptr = focused_window_ptr;
        }
    }

    let focused_ui_elem: *mut AXUIElement = focused_ui_ptr.cast::<AXUIElement>().cast_mut();
    let focused_ui: CFRetained<AXUIElement> =
        unsafe { CFRetained::from_raw(NonNull::new(focused_ui_elem).unwrap()) };

    // Prefer `AXSelectedText`; otherwise return None (can be extended to read ranges).
    let mut selected_text_ptr: *const CFType = std::ptr::null();
    let selected_text_attr = CFString::from_static_str("AXSelectedText");
    let err = unsafe {
        focused_ui.copy_attribute_value(
            &selected_text_attr,
            NonNull::new(&mut selected_text_ptr).unwrap(),
        )
    };
    if err != AXError::Success || selected_text_ptr.is_null() {
        return None;
    }

    // CFString → Rust String
    let selected_cfstr: CFRetained<CFString> = unsafe {
        CFRetained::from_raw(NonNull::new(selected_text_ptr.cast::<CFString>().cast_mut()).unwrap())
    };

    Some(selected_cfstr.to_string())
}

/// Read selected text with lightweight retries to handle transient AX focus instability.
#[cfg(target_os = "macos")]
fn read_selected_text_with_retries(retries: u32, delay_ms: u64) -> Option<String> {
    use std::thread;
    use std::time::Duration;
    for attempt in 0..=retries {
        if let Some(text) = read_selected_text() {
            if !text.is_empty() {
                if attempt > 0 {
                    // log::info!(
                    //     "read_selected_text: 第{}次重试成功，获取到选中文本",
                    //     attempt
                    // );
                }
                return Some(text);
            }
        }
        if attempt < retries {
            thread::sleep(Duration::from_millis(delay_ms));
        }
    }
    None
}
