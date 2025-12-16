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
      return { width: size.width, height: size.height };
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
    const window = await this.getCurrentWebviewWindow();
    if (window) {
      return window.setFullscreen(enable);
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
