// Window operations
export const windowWrapper = {
  async getCurrentWindow() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  },
  
  async getWebviewWindow() {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    return getCurrentWebviewWindow();
  },
  
  async setSize(width: number, height: number) {
    const { LogicalSize } = await import("@tauri-apps/api/dpi");
    const window = await this.getWebviewWindow();
    if (window) {
      await window.setSize(new LogicalSize(width, height));
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
    const { checkScreenRecordingPermission } = await import("tauri-plugin-macos-permissions-api");
    return checkScreenRecordingPermission();
  },
  
  async captureScreen(id: number, type: 'monitor' | 'window') {
    if (type === 'monitor') {
      const { getMonitorScreenshot } = await import("tauri-plugin-screenshots-api");
      return getMonitorScreenshot(id);
    } else {
      const { getWindowScreenshot } = await import("tauri-plugin-screenshots-api");
      return getWindowScreenshot(id);
    }
  },
};

// Command functions
export const commandWrapper = {
  async commands<T>(commandName: string, ...args: any[]): Promise<T> {
    const commands = await import('@/commands');
    if (commandName in commands) {
      console.log(`Command ${commandName} found`);
      return (commands as any)[commandName](...args);
    }
    throw new Error(`Command ${commandName} not found`);
  }
};