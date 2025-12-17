import * as commands from "@/commands";
import { WINDOW_CENTER_BASELINE_HEIGHT } from "@/constants";

// Window operations
export const windowWrapper = {
  async getCurrentWebviewWindow() {
    const { getCurrentWebviewWindow } = await import(
      "@tauri-apps/api/webviewWindow"
    );
    return getCurrentWebviewWindow();
  },

  async setSize(width: number, height: number) {
    const { LogicalSize } = await import("@tauri-apps/api/dpi");
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      await window.setSize(new LogicalSize(width, height));
      if (height < WINDOW_CENTER_BASELINE_HEIGHT) {
        await window.center();
      }
    }
  },
  async getSize() {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      const size = await window.innerSize();
      const scale = await window.scaleFactor();
      return { width: Math.round(size.width / scale), height: Math.round(size.height / scale) };
    }
    return { width: 0, height: 0 };
  },
  async setResizable(resizable: boolean) {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      return window.setResizable(resizable);
    }
  },
  async isResizable() {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      return window.isResizable();
    }
    return false;
  },
  async setFullscreen(enable: boolean) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    return win.setFullscreen(enable);
  },
  async center() {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      return window.center();
    }
  },
  async currentMonitor() {
    const { currentMonitor } = await import("@tauri-apps/api/window");
    const monitor = await currentMonitor();
    if (monitor) {
      const pos = monitor.position;
      const size = monitor.size;
      return { x: pos.x, y: pos.y, width: size.width, height: size.height };
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  },
  async setPosition(x: number, y: number) {
    const { LogicalPosition } = await import("@tauri-apps/api/dpi");
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      return window.setPosition(new LogicalPosition(x, y));
    }
  },
  async getPosition() {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      const pos = await window.outerPosition();
      const scale = await window.scaleFactor();
      return { x: Math.round(pos.x / scale), y: Math.round(pos.y / scale) };
    }
    return { x: 0, y: 0 };
  },
  async centerOnMonitor(width: number, height: number) {
    const { LogicalPosition } = await import("@tauri-apps/api/dpi");
    const window = await this.getCurrentWebviewWindow();
    if (!window) return;
    const monitor = await this.currentMonitor();
    const margin = 20;
    const w = Math.max(100, Math.min(monitor.width - margin * 2, width));
    const h = Math.max(60, Math.min(monitor.height - margin * 2, height));
    const x = monitor.x + Math.max(margin, Math.floor((monitor.width - w) / 2));
    const y = monitor.y + Math.max(margin, Math.floor((monitor.height - h) / 2));
    return window.setPosition(new LogicalPosition(x, y));
  },
  async isMaximized() {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      return window.isMaximized();
    }
    return false;
  },
  async setMaximized(enable: boolean) {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      if (enable) {
        return window.maximize();
      } else {
        return window.unmaximize();
      }
    }
  },
};

// Event handling
export const eventWrapper = {
  async emit(event: string, payload?: any) {
    const { emit } = await import("@tauri-apps/api/event");
    return emit(event, payload);
  },

  async listen(event: string, callback: Function) {
    const { listen } = await import("@tauri-apps/api/event");
    return listen(event, (e) => callback(e));
  },
};

// System functions
export const systemWrapper = {
  async checkScreenPermission() {
    const { checkScreenRecordingPermission } = await import(
      "tauri-plugin-macos-permissions-api"
    );
    return checkScreenRecordingPermission();
  },

  async captureScreen(id: number, type: "monitor" | "window") {
    if (type === "monitor") {
      const { getMonitorScreenshot } = await import(
        "tauri-plugin-screenshots-api"
      );
      return getMonitorScreenshot(id);
    } else {
      const { getWindowScreenshot } = await import(
        "tauri-plugin-screenshots-api"
      );
      return getWindowScreenshot(id);
    }
  },
};

// Command functions
export const commandWrapper = {
  async commands<T>(commandName: string, ...args: any[]): Promise<T> {
    if (commandName in commands) {
      // console.log(`Command ${commandName} found`);
      return (commands as any)[commandName](...args);
    }
    throw new Error(`Command ${commandName} not found`);
  },
};
