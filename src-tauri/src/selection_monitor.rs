// 事件负载（发送到前端的 JSON）
// 语义：表示一次“检测到选中”事件，包含选中文本与坐标。
// 坐标约定：物理像素（physical pixel），原点在左上。
// 注意：当前实现的坐标是「相对所选屏幕的左上角」像素坐标，
// 而 Tauri `outer_position()` 通常返回的是「全局桌面坐标」（主屏左上为原点）。
// 这可能导致多屏场景下坐标系不一致，见下文 TODO。
#[derive(serde::Serialize, Clone)]
struct SelectionEventPayload {
    text: String,
    x: i32,
    y: i32,
}

#[cfg(target_os = "macos")]
pub fn start_selection_monitor(app_handle: tauri::AppHandle) {
    // 入口：负责权限检查、平台特定初始化，以及启动后台线程。
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
        // 平台初始化：当前仅提示/请求权限，真正读取逻辑在下方线程。
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
        #[cfg(target_os = "macos")]
        use objc2_app_kit::NSWorkspace;

        // 鼠标坐标获取：统一为 “全局桌面左上原点 + 物理像素坐标”。
        // 说明：
        // - 使用 Quartz 全局点坐标（原点在主屏左下）获取鼠标位置；
        // - 计算所有显示器的全局左边界(min_x)与全局顶部(max_top)（单位 point）；
        // - 将全局点坐标转换为“全局左上原点”的点坐标，再按所处屏幕的缩放因子转换为物理像素；
        // 注意：跨屏距离按“所处屏幕的缩放因子”转换到像素，能与窗口 `outer_position()` 的物理坐标更一致，
        // 但在不同缩放屏幕组合下仍可能存在细微差异。若需完全严谨，应在前端或后端统一以点坐标进行比较与定位。
        let current_mouse = || -> (i32, i32) {
            unsafe {
                // 全局鼠标位置（Quartz，原点在左下，单位 point）
                let event = CGEvent::new(None);
                let pt = objc2_core_graphics::CGEvent::location(event.as_deref());

                // 获取所有活动显示器
                let mut displays: [u32; 16] = [0; 16];
                let mut display_count: u32 = 0;
                let _ = CGGetActiveDisplayList(displays.len() as u32, displays.as_mut_ptr(), &mut display_count);
                if display_count == 0 {
                    // 无显示器信息时回退主屏
                    let main = CGMainDisplayID();
                    let b = CGDisplayBounds(main);
                    let px_w = CGDisplayPixelsWide(main) as f64;
                    let px_h = CGDisplayPixelsHigh(main) as f64;
                    let pt_w = b.size.width as f64;
                    let pt_h = b.size.height as f64;
                    let scale_x = if pt_w > 0.0 { px_w / pt_w } else { 1.0 };
                    let scale_y = if pt_h > 0.0 { px_h / pt_h } else { 1.0 };
                    let min_x = b.origin.x as f64;
                    let max_top = (b.origin.y + b.size.height) as f64;
                    let x_px_global = ((pt.x as f64 - min_x) * scale_x).round() as i32;
                    let y_px_global_top = ((max_top - pt.y as f64) * scale_y).round() as i32;
                    return (x_px_global, y_px_global_top);
                }

                // 选取包含鼠标点的显示器（pt 落在哪个 bounds 内）
                let mut chosen = CGMainDisplayID(); // 回退主屏
                let mut min_x_pt = f64::INFINITY;
                let mut max_top_pt = f64::NEG_INFINITY; // 顶部 = origin.y + height
                for i in 0..display_count as usize {
                    let did = displays[i];
                    let b = CGDisplayBounds(did);
                    // 更新全局左边界与顶部（单位 point）
                    if (b.origin.x as f64) < min_x_pt {
                        min_x_pt = b.origin.x as f64;
                    }
                    let top = (b.origin.y + b.size.height) as f64;
                    if top > max_top_pt {
                        max_top_pt = top;
                    }

                    // 判断鼠标点所属显示器
                    let in_x = pt.x >= b.origin.x && pt.x <= b.origin.x + b.size.width;
                    let in_y = pt.y >= b.origin.y && pt.y <= b.origin.y + b.size.height;
                    if in_x && in_y {
                        chosen = did;
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

                // 全局左上原点下的物理像素坐标（以所处屏幕缩放转换）
                let x_px_global = ((pt.x as f64 - min_x_pt) * scale_x).round() as i32;
                let y_px_global_top = ((max_top_pt - pt.y as f64) * scale_y).round() as i32;
                (x_px_global, y_px_global_top)
            }
        };

        // 判断给定坐标是否落在选择窗口矩形内。
        // 期望坐标系：窗口位置来源于 `outer_position()`（全局桌面物理像素，左上为原点）。
        // 传入坐标：当前使用 `current_mouse()`（屏幕内相对坐标）。
        // 风险：坐标系不一致（多屏）会导致误判，进而在弹框内点击也被认为在外部，从而错误隐藏弹框。
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

        // 前台应用是否为本进程（Coco）。在与弹框交互时避免将“前台为空选区”误判为需要隐藏弹框。
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
                    // 事件设计：当前以发送空字符串的 `selection-detected` 来表示“隐藏”。
                    // 注意：这与发送对象 payload 的情况类型不一致（String vs Object），前端需做兼容。
                    // 建议：统一事件负载类型，例如总是发送对象，使用空文本或布尔字段表示隐藏。
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
                    let selected_text = match read_selected_text_with_retries(3, 50) {
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
                        // 语义：有选区 → 显示弹框（前端根据 text 渲染内容与位置）。
                        let _ = app_handle.emit("selection-detected", payload);
                        popup_visible = true;
                    } else {
                        log::info!("无选中内容，隐藏弹框");
                        // 语义：无选区 → 隐藏弹框。
                        let _ = app_handle.emit("selection-detected", "");
                        popup_visible = false;
                    }
                }
            }

            // 释放后若仍显示，但选中状态变为空（例如点击空白处），立即隐藏。
            // 但若前台应用为 Coco（本弹框窗口所在进程），或鼠标位于弹框区域内，则不隐藏，避免误判。
            if !left_pressed && popup_visible {
                let selected_text = match read_selected_text_with_retries(2, 50) {
                    Some(t) => t,
                    None => {
                        log::warn!("read_selected_text 获取失败");
                        String::new()
                    }
                };
                if selected_text.is_empty() {
                    if is_frontmost_app_me() {
                        log::info!("弹框显示且前台为 Coco，本次不隐藏弹框");
                    } else {
                        let (mx, my) = current_mouse();
                        if is_point_in_selection_window(mx, my) {
                            log::info!("弹框显示且鼠标位于弹框内，本次不隐藏弹框");
                        } else {
                            log::info!("弹框显示但选中内容为空，隐藏弹框");
                            let _ = app_handle.emit("selection-detected", "");
                            popup_visible = false;
                        }
                    }
                }
            }

            last_left_pressed = left_pressed;
        }
    });
}

#[cfg(target_os = "macos")]
fn check_accessibility_permissions() -> bool {
    // 使用系统 API 检查可访问性权限（不弹窗）。
    // 若需要弹窗提示，请在 `start_selection_monitor_macos` 中调用
    // `application_is_trusted_with_prompt()`。
    macos_accessibility_client::accessibility::application_is_trusted()
}

// macOS 系统范围可访问性：用于获取系统级焦点元素
#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn AXUIElementCreateSystemWide() -> *mut objc2_application_services::AXUIElement;
}

// 读取前台应用当前选中文本（无需剪贴板），仅在 macOS 可用
#[cfg(target_os = "macos")]
fn read_selected_text() -> Option<String> {
    // 通过 AX 接口读取当前前台应用的选中文本（非剪贴板）。
    // 注意：若前台应用为本进程（Coco），直接返回 None，避免自身窗口交互被误判为空选区。
    use objc2_app_kit::NSWorkspace;
    use objc2_application_services::{AXError, AXUIElement};
    use objc2_core_foundation::{CFRetained, CFString, CFType};
    use std::ptr::NonNull;

    // 优先使用系统范围的焦点元素，避免某些应用无法通过应用级 AX 读取焦点。
    // 若系统范围获取失败，再回退到前台应用级的焦点元素。
    let mut focused_ui_ptr: *const CFType = std::ptr::null();
    let focused_attr = CFString::from_static_str("AXFocusedUIElement");

    // 系统范围焦点元素
    let system_elem = unsafe { AXUIElementCreateSystemWide() };
    if !system_elem.is_null() {
        let system_elem_retained: CFRetained<AXUIElement> = unsafe {
            CFRetained::from_raw(NonNull::new(system_elem).unwrap())
        };
        let err = unsafe {
            system_elem_retained.copy_attribute_value(
                &focused_attr,
                NonNull::new(&mut focused_ui_ptr).unwrap(),
            )
        };
        if err != AXError::Success {
            log::warn!("系统范围 AXFocusedUIElement 获取失败，错误码={:?}", err);
            focused_ui_ptr = std::ptr::null();
        }
    } else {
        log::warn!("AXUIElementCreateSystemWide 返回空指针");
    }

    // 若系统范围失败，回退到前台应用的焦点/窗口元素
    if focused_ui_ptr.is_null() {
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
        let err = unsafe {
            app_element.copy_attribute_value(
                &focused_attr,
                NonNull::new(&mut focused_ui_ptr).unwrap(),
            )
        };
        if err != AXError::Success || focused_ui_ptr.is_null() {
            log::warn!("应用范围 AXFocusedUIElement 获取失败，错误码={:?}", err);
            // 尝试回退到窗口层级：AXFocusedWindow
            let mut focused_window_ptr: *const CFType = std::ptr::null();
            let focused_window_attr = CFString::from_static_str("AXFocusedWindow");
            let w_err = unsafe {
                app_element.copy_attribute_value(
                    &focused_window_attr,
                    NonNull::new(&mut focused_window_ptr).unwrap(),
                )
            };
            if w_err != AXError::Success || focused_window_ptr.is_null() {
                log::warn!("应用范围 AXFocusedWindow 获取失败，错误码={:?}", w_err);
                return None;
            }
            // 用窗口元素作为后续文本读取的目标
            focused_ui_ptr = focused_window_ptr;
        }
    }

    let focused_ui_elem: *mut AXUIElement = focused_ui_ptr.cast::<AXUIElement>().cast_mut();
    let focused_ui: CFRetained<AXUIElement> =
        unsafe { CFRetained::from_raw(NonNull::new(focused_ui_elem).unwrap()) };

    // 选中文本（优先直接获取 AXSelectedText）
    let mut selected_text_ptr: *const CFType = std::ptr::null();
    let selected_text_attr = CFString::from_static_str("AXSelectedText");
    let err = unsafe {
        focused_ui.copy_attribute_value(
            &selected_text_attr,
            NonNull::new(&mut selected_text_ptr).unwrap(),
        )
    };
    if err != AXError::Success || selected_text_ptr.is_null() {
        // 回退策略（轻量）：仍返回 None。
        // 可进一步扩展为读取 AXSelectedTextRange + AXAttributedStringForRange/AXStringForRange。
        log::warn!("AXSelectedText 获取失败，错误码={:?}", err);
        return None;
    }

    // CFString -> Rust String
    let selected_cfstr: CFRetained<CFString> = unsafe {
        CFRetained::from_raw(NonNull::new(selected_text_ptr.cast::<CFString>().cast_mut()).unwrap())
    };

    Some(selected_cfstr.to_string())
}

// 带重试的读取：针对释放事件后 AX 焦点与选区尚未稳定的情况
#[cfg(target_os = "macos")]
fn read_selected_text_with_retries(retries: u32, delay_ms: u64) -> Option<String> {
    use std::thread;
    use std::time::Duration;
    for attempt in 0..=retries {
        if let Some(text) = read_selected_text() {
            if !text.is_empty() {
                if attempt > 0 {
                    log::info!("read_selected_text: 第{}次重试成功，获取到选中文本", attempt);
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

// macOS: 读取选中文本并广播 selection-text（有内容显示，空内容隐藏）
#[cfg(target_os = "macos")]
fn start_selection_monitor_macos(_app_handle: tauri::AppHandle) {
    // 平台特定初始化：当前仅负责请求辅助功能权限（可能弹系统提示）。
    log::info!("start_selection_monitor_macos: macOS 划词检测线程启动");
    // 请求辅助功能权限（会弹窗提示）
    let trusted = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
    if !trusted {
        log::warn!("macOS 辅助功能权限未开启，无法读取选中文本");
    } else {
        log::info!("macOS 辅助功能权限已开启");
    }
}
