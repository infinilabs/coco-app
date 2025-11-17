// 事件负载（发送到前端的 JSON）
// 语义：表示一次“检测到选中”事件，包含选中文本与坐标。
// 坐标约定：逻辑坐标（Quartz point），原点在全局左上。
// 说明：发送 point 坐标，前端以 Logical 进行定位，可直接使用并做少量偏移。
/// 发送到前端的事件载荷：一次“检测到选中”事件
/// 坐标：逻辑坐标（Quartz point），全局左上为原点；当前 y 已在后端反转以配合前端
use tauri::Emitter;

#[derive(serde::Serialize, Clone)]
struct SelectionEventPayload {
    text: String,
    x: i32,
    y: i32,
}

use std::sync::atomic::{AtomicBool, Ordering};

// 全局开关：默认启用划词监控
static SELECTION_ENABLED: AtomicBool = AtomicBool::new(true);

#[derive(serde::Serialize, Clone)]
struct SelectionEnabledPayload {
    enabled: bool,
}

/// 读取当前开关状态
pub fn is_selection_enabled() -> bool {
    SELECTION_ENABLED.load(Ordering::Relaxed)
}

/// 内部设置开关并广播到前端
fn set_selection_enabled_internal(app_handle: &tauri::AppHandle, enabled: bool) {
    SELECTION_ENABLED.store(enabled, Ordering::Relaxed);
    let _ = app_handle.emit("selection-enabled", SelectionEnabledPayload { enabled });
}

/// Tauri 命令：设置开关（前端调用）
#[tauri::command]
pub fn set_selection_enabled(app_handle: tauri::AppHandle, enabled: bool) {
    set_selection_enabled_internal(&app_handle, enabled);
}

/// Tauri 命令：获取当前开关状态（前端调用）
#[tauri::command]
pub fn get_selection_enabled() -> bool {
    is_selection_enabled()
}

#[cfg(target_os = "macos")]
pub fn start_selection_monitor(app_handle: tauri::AppHandle) {
    // 入口：负责权限检查、平台特定初始化，以及启动后台线程。
    log::info!("start_selection_monitor: 入口函数启动");
    use std::time::Duration;
    use tauri::Emitter;

    // 启动时同步一次当前启用状态到前端
    set_selection_enabled_internal(&app_handle, is_selection_enabled());

    // 权限检查与申请：需要辅助功能权限以读取前台应用选中文本
    // 1) 若未授予，则弹窗申请；
    // 2) 若用户拒绝或未授予，则忽略本功能（直接返回，不启动监听线程）。
    #[cfg(target_os = "macos")]
    {
        let trusted_before = macos_accessibility_client::accessibility::application_is_trusted();
        if !trusted_before {
            // 弹窗申请（系统可能不会立即返回新状态，下面仍会再检查一次）
            let _ = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        }
        let trusted_after = macos_accessibility_client::accessibility::application_is_trusted();
        if !trusted_after {
            return; // 不启动监听线程，忽略功能
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        log::info!("start_selection_monitor: 非 macOS 平台，无划词监控");
    }

    // 后台线程：基于鼠标按压/释放与 AX 选中状态驱动弹框显示/隐藏
    std::thread::spawn(move || {
        #[cfg(target_os = "macos")]
        use objc2_app_kit::NSWorkspace;
        use objc2_core_graphics::CGEvent;
        use objc2_core_graphics::{CGDisplayBounds, CGGetActiveDisplayList, CGMainDisplayID};

        // 反转后的 Quartz point（逻辑坐标）
        let current_mouse_point_global = || -> (i32, i32) {
            unsafe {
                // 全局鼠标位置（Quartz，原点左下，单位 point）
                let event = CGEvent::new(None);
                let pt = objc2_core_graphics::CGEvent::location(event.as_deref());

                // 获取所有活动显示器
                let mut displays: [u32; 16] = [0; 16];
                let mut display_count: u32 = 0;
                let _ = CGGetActiveDisplayList(
                    displays.len() as u32,
                    displays.as_mut_ptr(),
                    &mut display_count,
                );
                if display_count == 0 {
                    // 无显示器信息时回退主屏
                    let did = CGMainDisplayID();
                    let b = CGDisplayBounds(did);
                    let min_x_pt = b.origin.x as f64;
                    let max_top_pt = (b.origin.y + b.size.height) as f64;
                    let min_bottom_pt = b.origin.y as f64;
                    let total_h_pt = max_top_pt - min_bottom_pt;

                    // 左上原点坐标
                    let x_top_left = (pt.x as f64 - min_x_pt).round() as i32;
                    let y_top_left = (max_top_pt - pt.y as f64).round() as i32;
                    // 反转为“自底部量起”的值，用来抵消当前前端的上下反转效果
                    let y_flipped = (total_h_pt.round() as i32 - y_top_left).max(0);

                    return (x_top_left, y_flipped);
                }

                // 选取包含鼠标点的显示器，并计算全局边界
                let mut chosen = CGMainDisplayID(); // 回退主屏
                log::info!(
                    "current_mouse: pt=({:.1},{:.1}) → display={}",
                    pt.x as f64,
                    pt.y as f64,
                    chosen
                );

                let mut min_x_pt = f64::INFINITY;
                let mut max_top_pt = f64::NEG_INFINITY; // 顶部 = origin.y + height
                let mut min_bottom_pt = f64::INFINITY; // 最低的 origin.y
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
                        chosen = did;
                        log::info!(
                            "current_mouse: pt=({:.1},{:.1}) → display={} → point_global_top_left=(x={}, y={})",
                            pt.x as f64,
                            pt.y as f64,
                            chosen,
                            b.origin.x,
                            b.origin.y
                        );
                    }
                }

                let total_h_pt = max_top_pt - min_bottom_pt;

                // 左上原点坐标
                let x_top_left = (pt.x as f64 - min_x_pt).round() as i32;
                let y_top_left = (max_top_pt - pt.y as f64).round() as i32;
                // 反转为“自底部量起”的值
                let y_flipped = (total_h_pt.round() as i32 - y_top_left).max(0);

                (x_top_left, y_flipped)
            }
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

        // 选择驱动的状态机（丝滑版）
        let mut popup_visible = false;
        let mut last_text = String::new();

        // 稳定性与隐藏判定参数（可按需微调）
        let stable_threshold = 2; // 连续相同≥2次才认为“稳定选中”
        let empty_threshold = 2; // 连续空值≥2次才认为“稳定为空”
        let mut stable_text = String::new();
        let mut stable_count = 0;
        let mut empty_count = 0;

        loop {
            std::thread::sleep(Duration::from_millis(30));

            // 若功能关闭：不读取 AX，不弹窗；如已显示则主动隐藏
            if !is_selection_enabled() {
                if popup_visible {
                    let _ = app_handle.emit("selection-detected", "");
                    popup_visible = false;
                    last_text.clear();
                    stable_text.clear();
                }
                continue;
            }

            // 若前台为 Coco（弹框所在进程），跳过隐藏判定以避免交互导致闪烁
            let front_is_me = is_frontmost_app_me();

            // 轻量重试以应对 AX 焦点瞬时不稳定（避免卡顿）
            let selected_text = if front_is_me {
                // 与弹框交互中：不主动读取选区，避免误判为空
                None
            } else {
                // 低开销重试：最多 2 次，每次间隔 35ms
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

                    // 选区稳定后才触发显示或更新，避免卡顿和抖动
                    if stable_count >= stable_threshold {
                        if !popup_visible || text != last_text {
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
                    // 非 Coco 前台且选区为空：累计空值，达到阈值再隐藏
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
                        // 前台为 Coco：交互中不隐藏也不清空状态，保证丝滑体验
                        // 不修改 popup_visible / last_text / stable_text
                    }
                }
            }
        }
    });
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

    // 若系统范围失败，回退到前台应用的焦点/窗口元素
    if focused_ui_ptr.is_null() {
        let workspace = unsafe { NSWorkspace::sharedWorkspace() };
        let frontmost_app = unsafe { workspace.frontmostApplication() }?;
        let pid = unsafe { frontmost_app.processIdentifier() };

        // 如果当前前台应用就是 Coco（本进程），直接跳过选区读取，避免误判为空
        let my_pid = std::process::id() as i32;
        if pid == my_pid {
            return None;
        }

        // 应用 AX 元素
        let app_element = unsafe { AXUIElement::new_application(pid) };
        let err = unsafe {
            app_element
                .copy_attribute_value(&focused_attr, NonNull::new(&mut focused_ui_ptr).unwrap())
        };
        if err != AXError::Success || focused_ui_ptr.is_null() {
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
                    log::info!(
                        "read_selected_text: 第{}次重试成功，获取到选中文本",
                        attempt
                    );
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
