#[derive(serde::Serialize, Clone)]
struct SelectionEventPayload {
    text: String,
    x: i32,
    y: i32,
}

#[cfg(target_os = "macos")]
pub fn start_selection_monitor(app_handle: tauri::AppHandle) {
    log::info!("start_selection_monitor: 入口函数启动");
    use std::time::Duration;
    use tauri::Emitter;
    use tauri::Manager;

    // 权限提示：需要辅助功能权限以读取前台应用选中文本
    let has_permission = check_accessibility_permissions();
    if !has_permission {
        log::warn!(
            "macOS Accessibility 权限未启用，无法读取选中文本。请在系统设置的“辅助功能”中授予 Coco 权限。"
        );
    } else {
        log::info!("macOS Accessibility 权限已启用");
    }

    #[cfg(target_os = "macos")]
    {
        log::info!("start_selection_monitor: 调用 start_selection_monitor_macos");
        start_selection_monitor_macos(app_handle.clone());
    }
    #[cfg(not(target_os = "macos"))]
    {
        log::info!("start_selection_monitor: 非 macOS 平台，无划词监控");
    }

    // 后台线程：基于鼠标按压/释放与 AX 选中状态驱动弹框显示/隐藏
    std::thread::spawn(move || {
        use objc2_app_kit::NSEvent;
        use objc2_core_graphics::CGEvent;
        use objc2_core_graphics::{
            CGDisplayBounds, CGDisplayPixelsHigh, CGDisplayPixelsWide, CGGetActiveDisplayList,
            CGMainDisplayID,
        };

        // 统一为：左上角原点 + 物理像素坐标（多屏/Retina 兼容）
        let current_mouse = || -> (i32, i32) {
            unsafe {
                // 全局鼠标位置（Quartz，原点在左下，单位 point）
                let event = CGEvent::new(None);
                let pt = objc2_core_graphics::CGEvent::location(event.as_deref());

                // 获取所有活动显示器
                let mut displays: [u32; 16] = [0; 16];
                let mut display_count: u32 = 0;
                let _ = CGGetActiveDisplayList(displays.len() as u32, displays.as_mut_ptr(), &mut display_count);

                // 选取包含鼠标点的显示器（pt 落在哪个 bounds 内）
                let mut chosen = CGMainDisplayID(); // 回退主屏
                for i in 0..display_count as usize {
                    let did = displays[i];
                    let b = CGDisplayBounds(did);
                    let in_x = pt.x >= b.origin.x && pt.x <= b.origin.x + b.size.width;
                    let in_y = pt.y >= b.origin.y && pt.y <= b.origin.y + b.size.height;
                    if in_x && in_y {
                        chosen = did;
                        break;
                    }
                }

                // 选定屏幕的边界（point）与像素尺寸
                let bounds = CGDisplayBounds(chosen);
                let px_w = CGDisplayPixelsWide(chosen) as f64;
                let px_h = CGDisplayPixelsHigh(chosen) as f64;
                let pt_w = bounds.size.width as f64;
                let pt_h = bounds.size.height as f64;

                // 缩放因子（避免 Retina 下 2x 偏移）
                let scale_x = if pt_w > 0.0 { px_w / pt_w } else { 1.0 };
                let scale_y = if pt_h > 0.0 { px_h / pt_h } else { 1.0 };

                // 相对该屏幕左上角的物理像素坐标
                let x_px = ((pt.x - bounds.origin.x) as f64 * scale_x).round() as i32;
                let y_px_top = (((bounds.origin.y + bounds.size.height) - pt.y) as f64 * scale_y).round() as i32;

                // 转为“全局左上角”坐标：该屏幕左上角在全局的 y 是 (bounds.origin.y + bounds.size.height)
                // 但上面的 y_px_top 已经做了翻转，且 offset 已在 setPosition 处处理，这里返回屏幕内相对左上像素即可。
                (x_px, y_px_top)
            }
        };

        // 判断给定屏幕坐标是否落在选择窗口矩形内（同为物理像素 + 左上角原点）
        let is_point_in_selection_window = |x: i32, y: i32| -> bool {
            if let Some(win) = app_handle.get_webview_window("selection") {
                if let (Ok(pos), Ok(size)) = (win.outer_position(), win.outer_size()) {
                    let x0 = pos.x;
                    let y0 = pos.y;
                    let w = size.width as i32;
                    let h = size.height as i32;
                    return x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h;
                }
            }
            false
        };

        log::info!("start_selection_monitor: 鼠标监控线程已启动");
        let mut last_left_pressed = false;
        let mut popup_visible = false;
        let mut last_click_in_popup = false;

        loop {
            std::thread::sleep(Duration::from_millis(30));

            let buttons_mask = unsafe { NSEvent::pressedMouseButtons() } as u64;
            let left_pressed = (buttons_mask & 0x1) == 0x1;

            // 鼠标按下：仅当按下发生在弹框外部时才隐藏弹框
            if left_pressed && !last_left_pressed {
                let (mx, my) = current_mouse();
                last_click_in_popup = popup_visible && is_point_in_selection_window(mx, my);

                if popup_visible && !last_click_in_popup {
                    log::info!("鼠标左键按下于弹框外部，隐藏弹框");
                    let _ = app_handle.emit("selection-detected", "");
                    popup_visible = false;
                } else if popup_visible && last_click_in_popup {
                    log::info!("鼠标左键按下于弹框内部，忽略本次按下事件");
                }
            }

            // 鼠标释放：若上次按下发生在弹框内部，跳过读取选区与隐藏弹框逻辑
            if !left_pressed && last_left_pressed {
                if last_click_in_popup {
                    log::info!("鼠标释放且点击发生在弹框内部，跳过选区读取");
                    last_click_in_popup = false;
                    // 不改变 popup_visible 状态
                } else {
                    log::info!("鼠标左键释放，检测选中文本");
                    let selected_text = match read_selected_text() {
                        Some(t) => t,
                        None => {
                            log::warn!("read_selected_text 获取失败");
                            String::new()
                        }
                    };

                    if !selected_text.is_empty() {
                        let (x, y) = current_mouse();

                        let payload = SelectionEventPayload { text: selected_text.clone(), x, y };
                        log::info!(
                            "发送 selection-detected 事件: text=\"{}\", x={}, y={}",
                            payload.text, payload.x, payload.y
                        );
                        let _ = app_handle.emit("selection-detected", payload);
                        popup_visible = true;
                    } else {
                        log::info!("无选中内容，隐藏弹框");
                        let _ = app_handle.emit("selection-detected", "");
                        popup_visible = false;
                    }
                }
            }

            // 释放后若仍显示，但选中状态变为空（例如点击空白处），立即隐藏
            if !left_pressed && popup_visible {
                let selected_text = match read_selected_text() {
                    Some(t) => t,
                    None => {
                        log::warn!("read_selected_text 获取失败");
                        String::new()
                    }
                };
                if selected_text.is_empty() {
                    log::info!("弹框显示但选中内容为空，隐藏弹框");
                    let _ = app_handle.emit("selection-detected", "");
                    popup_visible = false;
                }
            }

            last_left_pressed = left_pressed;
        }
    });
}

#[cfg(target_os = "macos")]
fn check_accessibility_permissions() -> bool {
    // 占位实现：尝试创建一个键盘事件对象，若失败则判定可能缺少权限。
    // 后续可替换为 AXIsProcessTrustedWithOptions 更精确的检测。
    use objc2_core_graphics::CGEvent;
    unsafe { CGEvent::new_keyboard_event(None, 0, false).is_some() }
}

// 读取前台应用当前选中文本（无需剪贴板），仅在 macOS 可用
#[cfg(target_os = "macos")]
fn read_selected_text() -> Option<String> {
    use objc2_app_kit::NSWorkspace;
    use objc2_application_services::{AXError, AXUIElement};
    use objc2_core_foundation::{CFRetained, CFString, CFType};
    use std::ptr::NonNull;

    let workspace = unsafe { NSWorkspace::sharedWorkspace() };
    let frontmost_app = unsafe { workspace.frontmostApplication() }?;
    let pid = unsafe { frontmost_app.processIdentifier() };

    // 如果当前前台应用就是 Coco（本进程），直接跳过选区读取，避免误判为空
    let my_pid = std::process::id() as i32;
    if pid == my_pid {
        log::info!("前台应用为 Coco，自身窗口交互，跳过 AXSelectedText 读取");
        return None;
    }

    // 应用 AX 元素
    let app_element = unsafe { AXUIElement::new_application(pid) };

    // 焦点 UI 元素
    let mut focused_ui_ptr: *const CFType = std::ptr::null();
    let focused_attr = CFString::from_static_str("AXFocusedUIElement");
    let err = unsafe {
        app_element.copy_attribute_value(&focused_attr, NonNull::new(&mut focused_ui_ptr).unwrap())
    };
    if err != AXError::Success || focused_ui_ptr.is_null() {
        log::warn!("AXFocusedUIElement 获取失败");
        return None;
    }

    let focused_ui_elem: *mut AXUIElement = focused_ui_ptr.cast::<AXUIElement>().cast_mut();
    let focused_ui: CFRetained<AXUIElement> =
        unsafe { CFRetained::from_raw(NonNull::new(focused_ui_elem).unwrap()) };

    // 选中文本
    let mut selected_text_ptr: *const CFType = std::ptr::null();
    let selected_text_attr = CFString::from_static_str("AXSelectedText");
    let err = unsafe {
        focused_ui.copy_attribute_value(
            &selected_text_attr,
            NonNull::new(&mut selected_text_ptr).unwrap(),
        )
    };
    if err != AXError::Success || selected_text_ptr.is_null() {
        log::warn!("AXSelectedText 获取失败");
        return None;
    }

    // CFString -> Rust String
    let selected_cfstr: CFRetained<CFString> = unsafe {
        CFRetained::from_raw(NonNull::new(selected_text_ptr.cast::<CFString>().cast_mut()).unwrap())
    };

    Some(selected_cfstr.to_string())
}

// macOS: 读取选中文本并广播 selection-text（有内容显示，空内容隐藏）
#[cfg(target_os = "macos")]
fn start_selection_monitor_macos(_app_handle: tauri::AppHandle) {
    log::info!("start_selection_monitor_macos: macOS 划词检测线程启动");
    // 请求辅助功能权限（会弹窗提示）
    let trusted = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
    if !trusted {
        log::warn!("macOS 辅助功能权限未开启，无法读取选中文本");
    } else {
        log::info!("macOS 辅助功能权限已开启");
    }
}
