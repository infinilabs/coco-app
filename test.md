我先在仓库中检索与“划词、剪贴板、热键、OCR/截图”相关的核心模块。

**核心原理概览**
- 选区文本获取：后端使用 `selection` crate（Cargo.toml 中 `selection = "1.2.0"`）跨平台获取当前选中的文本。
- 触发链路：
  - 全局快捷键触发：Rust 侧注册并绑定到 `selection_translate()`。
  - 外部调用触发：内置 tiny_http 本地服务，`GET /selection_translate` 调用 `selection_translate()`。
  - 剪贴板触发：后端轮询系统剪贴板，内容变化时调用 `text_translate(text)`。
- 事件通信：后端通过 `window.emit("new_text", text)`（或 `AppHandle.emit_all`）向前端发送事件，前端监听 `new_text` 并更新 UI、触发翻译流程。

**关键代码分析**
- 后端窗口与事件
  - 文件：`src-tauri/src/window.rs`
    - `selection_translate()`：调用 `selection::get_text()` 获取选中内容，将其写入共享状态 `StringWrapper`，并向翻译窗口触发 `new_text` 事件。
    - `text_translate(text: String)`：将文本写入状态并触发 `new_text` 事件。
    - 多窗口管理：根据鼠标所在屏幕计算窗口位置，保持弹窗在合适位置；OCR 截图与识别窗口也在此统一管理。
  - 文件：`src-tauri/src/hotkey.rs`
    - 通过 `tauri` v1 的 `GlobalShortcutManager` 注册快捷键；`hotkey_selection_translate` 绑定到 `selection_translate()`。
  - 文件：`src-tauri/src/server.rs`
    - 内置 HTTP 服务器（tiny_http）监听本地端口，路由 `"/selection_translate"` 调用 `selection_translate()`；亦支持 `"/translate"`, `"/input_translate"`, `"/ocr_recognize"`, `"/ocr_translate"`。
- 文本选择捕获
  - 来源：`selection` crate（`selection::get_text()`），负责跨平台从当前聚焦应用中读取选区文本。
  - macOS 可选增强：`macos-accessibility-client` 询问并提示辅助访问权限，以提升选取可靠性。
- 剪贴板交互
  - 文件：`src-tauri/src/clipboard.rs`
    - 维护一个 `ClipboardMonitorEnableWrapper` 状态，后端起线程每 500ms 读剪贴板（v1 用 `app_handle.clipboard_manager().read_text()`），内容变化则调用 `text_translate`。
  - 文件：`src-tauri/src/main.rs`
    - 初始化 `StringWrapper`（`Mutex<String>`）作为应用状态；按配置开关 `clipboard_monitor` 自动启动监听。
- 前端事件监听与翻译触发
  - 文件：`src/window/Translate/components/SourceArea/index.jsx`
    - 通过 `listen('new_text', ...)` 订阅后端事件；在 `handleNewText()` 中清洗文本、语言检测、触发翻译、更新 UI。
    - 初次挂载时通过 `invoke('get_text')` 读取后端状态以恢复。

**事件与触发链路**
- 快捷键 → Rust `selection_translate()` → `emit('new_text', text)` → 前端 `listen('new_text', ...)` → 翻译 UI 更新与翻译调用。
- 外部调用（PopClip、SnipDo 等）→ `GET /selection_translate` → 同步触发上述流程。
- 剪贴板轮询 → 剪贴板内容变化 → `text_translate(text)` → 同样触发 `new_text` 事件链路。

**Tauri v2 迁移实现方案（coco-app）**
- 选区文本获取：继续使用 `selection` crate 的 `get_text()`，保持跨平台行为一致。
- 全局快捷键：
  - 推荐使用 v2 插件 `tauri-plugin-global-shortcut`（JS 端）或 `tauri_plugin_global_shortcut`（Rust 端）进行注册。
  - 建议改为“前端注册、后端执行”的模式：JS 注册加速键，触发时 `invoke('selection_translate')`，由后端统一取得选中内容与事件发送。
- 剪贴板监听：
  - v2 中建议改用 `arboard` crate 在 Rust 线程侧轮询（跨平台可靠），避免依赖 v2 的剪贴板插件的 Rust API不确定性。
  - 保留开关与状态，保持“内容变化触发翻译”的体验。
- 事件通信与窗口：
  - `emit`/`emit_all` 在 v2 仍可用；保持 `new_text` 事件名与前端监听逻辑不变。
  - 翻译窗口的显示位置、大小与 UI 交互保持一致，确保用户体验延续。
- 外部调用：
  - tiny_http 可继续使用；路由与触发逻辑保持一致，兼容 PopClip/SnipDo 调用。
- 权限与安全模型：
  - v2 安全模型更严格，需在配置/Capabilities 中显式声明所需插件与权限。
  - macOS 下需继续提示辅助访问权限（提升选区读取成功率）。

**示例代码（v2 版）**
以下片段是迁移重点的最小实现，保持与 v1 相同行为。请将其整合到 coco-app 的 v2 项目结构中。

- Rust：后端命令与事件（保留状态与逻辑）
```rust:src-tauri/src/main.rs
// ... existing code ...
use std::sync::Mutex;
use tauri::{Manager, State};

pub struct StringWrapper(pub Mutex<String>);

#[tauri::command]
fn selection_translate(state: State<StringWrapper>, app: tauri::AppHandle) {
    let text = selection::get_text();
    if !text.trim().is_empty() {
        state.0.lock().unwrap().replace_range(.., &text);
    }
    // 将选区文本广播给前端
    app.emit_all("new_text", text).unwrap();
}

// 可复用 v1 的 text_translate 语义
#[tauri::command]
fn text_translate(text: String, state: State<StringWrapper>, app: tauri::AppHandle) {
    state.0.lock().unwrap().replace_range(.., &text);
    app.emit_all("new_text", text).unwrap();
}

fn main() {
    tauri::Builder::default()
        // v2 插件注册（若使用 Rust 端快捷键插件）
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // 管理状态
        .manage(StringWrapper(Mutex::new(String::new())))
        .invoke_handler(tauri::generate_handler![
            selection_translate,
            text_translate,
            // ... existing code ...
        ])
        // ... existing code ...
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
// ... existing code ...
```

- Rust：剪贴板监听（使用 `arboard`，避免 v2 中剪贴板 API 差异）
```rust:src-tauri/src/clipboard.rs
use std::sync::Mutex;
use tauri::Manager;
use arboard::Clipboard;

pub struct ClipboardMonitorEnable(pub Mutex<bool>);

pub fn start_clipboard_monitor(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut pre_text = String::new();
        let mut clipboard = Clipboard::new().ok();

        loop {
            let enabled = app.state::<ClipboardMonitorEnable>().0.lock().unwrap().clone();
            if !enabled { break; }

            if let Some(cb) = &mut clipboard {
                if let Ok(text) = cb.get_text() {
                    if text != pre_text {
                        // 复用后端翻译入口
                        let _ = app.emit_all("new_text", text.clone());
                        pre_text = text;
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    });
}
```

- 前端：全局快捷键注册（使用 v2 JS 插件，触发后端命令）
```javascript:src/hotkey/registerSelectionShortcut.js
import { register, isRegistered, unregister } from '@tauri-apps/plugin-global-shortcut';
import { invoke } from '@tauri-apps/api/core';

export async function registerSelectionShortcut(accelerator) {
  if (!accelerator) return;
  if (await isRegistered(accelerator)) await unregister(accelerator);
  await register(accelerator, () => {
    invoke('selection_translate');
  });
}
```

- 前端：事件监听与翻译触发（保持 v1 逻辑）
```javascript:src/window/Translate/bridge.js
import { listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';

export function subscribeNewText(onText) {
  return listen('new_text', (event) => {
    appWindow.setFocus();
    onText(event.payload);
  });
}
```

- v2 配置：声明插件与权限（示例）
```json:src-tauri/tauri.conf.json
{
  // ... existing code ...
  "plugins": {
    "global-shortcut": {},
    // 若使用 JS 端剪贴板插件，可在此启用
    "clipboard": {}
  },
  "security": {
    "csp": null
  },
  "app": {
    "windows": [
      // 声明翻译窗口、隐藏的 daemon 窗口等
    ]
  }
}
```

- Cargo（v2）依赖（关键项）
```toml:src-tauri/Cargo.toml
# ... existing code ...
[dependencies]
tauri = { version = "2", features = ["macos-private-api", "devtools"] }
selection = "1.2.0"
arboard = "3.4"
log = "0.4"
once_cell = "1.19"

# 插件（Rust 侧注册快捷键）
tauri-plugin-global-shortcut = "2"

[target.'cfg(target_os = "macos")'.dependencies]
macos-accessibility-client = "0.0.1"
```

**权限与安全**
- macOS：在 `setup` 阶段提示辅助访问权限（`macos-accessibility-client::accessibility::application_is_trusted_with_prompt()`），否则选区读取可能失败。
- v2 插件：确保只启用必要的插件，遵循最小权限原则；如需 JS 端读剪贴板才启用 `clipboard` 插件。
- 外部调用：本地 HTTP 端口仅监听 `127.0.0.1`，避免外部网络访问；可在 v2 中加端口配置、随机化或基于令牌校验（如需）。

**跨平台注意事项**
- 选区读取：
  - macOS/Windows：`selection::get_text()` 效果较好；macOS 注意辅助访问权限。
  - Linux：若选区读取受限，fallback 到剪贴板方式（提示用户先按系统“复制”后再触发快捷键）。
- 快捷键冲突：多平台键位命名差异（`Super`/`Command`）与键盘布局差异；建议使用统一 UI 映射（v1 已有键盘码映射）。
- OCR：如需保留截图翻译，macOS 用 `screencapture`，Windows 用 UWP OCR API，Linux 用 tesseract（保持 v1 逻辑）。

**测试用例建议**
- 单元/集成
  - 选区捕获：模拟快捷键触发 `selection_translate`，断言后端状态与 `new_text` 事件收到非空文本。
  - 剪贴板监听：启用监听，程序化写入剪贴板，断言 `new_text` 事件次数与载荷内容。
  - 外部调用：对本地 HTTP `GET /selection_translate` 发起请求，断言流程与事件一致。
  - 前端桥接：`listen('new_text')` 回调触发 UI 更新、语言检测与翻译（可 mock 翻译服务）。
- 跨平台回归
  - macOS 下未授权辅助访问时的降级提示、授权后成功路径。
  - Windows/Linux 不同键位与剪贴板实现可靠性。
- 性能与鲁棒
  - 剪贴板轮询节流：500ms 间隔下页面不卡顿；并发翻译防抖。
  - 大文本处理：语言检测与翻译耗时统计与超时处理（建议 5–10 秒超时）。

**性能优化建议**
- 事件去抖：前端 `dynamicTranslate` 模式下对文本输入 800–1000ms 去抖再触发翻译。
- 语言检测本地化：仅在文本长度较小或服务端未返回语言时进行本地 `lingua` 检测。
- 剪贴板轮询：减少重复翻译，缓存最近一次文本；可根据平台调整轮询间隔。
- 窗口管理：翻译窗口按鼠标位置弹出时预先计算屏幕边缘裁剪，避免多次 `set_position`。

如果你愿意，我可以把上述 v2 方案直接按 coco-app 的实际目录结构对接成具体文件改动清单，并补充对应的配置与示例测试脚本。