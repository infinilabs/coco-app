import * as commands from "@/commands";
import { WINDOW_CENTER_BASELINE_HEIGHT } from "@/constants";
import platformAdapter from "../platformAdapter";

// Window operations
export const windowWrapper = {
  async getCurrentWebviewWindow() {
    const { getCurrentWebviewWindow } = await import(
      "@tauri-apps/api/webviewWindow"
    );
    return getCurrentWebviewWindow();
  },

  async setLogicalSize(width: number, height: number) {
    const { LogicalSize } = await import("@tauri-apps/api/dpi");
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      await window.setSize(new LogicalSize(width, height));
      if (height < WINDOW_CENTER_BASELINE_HEIGHT) {
        await window.center();
      }
    }
  },
  async getLogicalSize() {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      const size = await window.innerSize();
      const scale = await window.scaleFactor();
      return {
        width: Math.round(size.width / scale),
        height: Math.round(size.height / scale),
      };
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

  async setLogicalPosition(x: number, y: number) {
    const { LogicalPosition } = await import("@tauri-apps/api/dpi");
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      return window.setPosition(new LogicalPosition(x, y));
    }
  },
  async getLogicalPosition() {
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      const pos = await window.outerPosition();
      const scale = await window.scaleFactor();
      return { x: Math.round(pos.x / scale), y: Math.round(pos.y / scale) };
    }
    return { x: 0, y: 0 };
  },
  async centerOnMonitor() {
    const { PhysicalPosition } = await import("@tauri-apps/api/dpi");

    const monitor = await platformAdapter.getMonitorFromCursor();

    if (!monitor) return;

    const window = await this.getCurrentWebviewWindow();

    const { x: monitorX, y: monitorY } = monitor.position;
    const { width: monitorWidth, height: monitorHeight } = monitor.size;

    const windowSize = await window.innerSize();

    const x = monitorX + (monitorWidth - windowSize.width) / 2;
    const y = monitorY + (monitorHeight - windowSize.height) / 2;

    return window.setPosition(new PhysicalPosition(x, y));
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
