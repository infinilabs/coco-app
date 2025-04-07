import type { PlatformAdapter, EventPayloads } from './platformAdapter';

import type { OpenDialogOptions } from '@tauri-apps/plugin-dialog';

// Create Tauri adapter functions
export const createTauriAdapter = (): PlatformAdapter => {
  return {
    async invokeBackend(command: string, args?: any): Promise<any> {
      const { invoke } = await import("@tauri-apps/api/core");
      return invoke(command, args);
    },

    async setWindowSize(width: number, height: number): Promise<void> {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { LogicalSize } = await import("@tauri-apps/api/dpi");
      const window = await getCurrentWebviewWindow();
      if (window) {
        await window.setSize(new LogicalSize(width, height));
      }
    },

    async hideWindow(): Promise<void> {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("hide_coco");
    },

    async showWindow(): Promise<void> {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const window = await getCurrentWebviewWindow();
      if (window) {
        await window.show();
      }
    },

    convertFileSrc(path: string): string {
      const { convertFileSrc } = require("@tauri-apps/api/core");
      return convertFileSrc(path);
    },

    async emitEvent(event: string, payload?: any) {
      const { emit } = await import("@tauri-apps/api/event");
      return emit(event, payload);
    },

    async listenEvent<K extends keyof EventPayloads>(
      event: K,
      callback: (event: { payload: EventPayloads[K] }) => void
    ) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen(event, callback);
    },

    async setAlwaysOnTop(isPinned: boolean) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const window = getCurrentWindow();
      return window.setAlwaysOnTop(isPinned);
    },

    async checkScreenRecordingPermission() {
      const { checkScreenRecordingPermission } = await import("tauri-plugin-macos-permissions-api");
      return checkScreenRecordingPermission();
    },

    async requestScreenRecordingPermission() {
      const { requestScreenRecordingPermission } = await import("tauri-plugin-macos-permissions-api");
      return requestScreenRecordingPermission();
    },

    async getScreenshotableMonitors() {
      const { getScreenshotableMonitors } = await import("tauri-plugin-screenshots-api");
      return getScreenshotableMonitors();
    },

    async getScreenshotableWindows() {
      const { getScreenshotableWindows } = await import("tauri-plugin-screenshots-api");
      return getScreenshotableWindows();
    },

    async captureMonitorScreenshot(id: number) {
      const { getMonitorScreenshot } = await import("tauri-plugin-screenshots-api");
      return getMonitorScreenshot(id);
    },

    async captureWindowScreenshot(id: number) {
      const { getWindowScreenshot } = await import("tauri-plugin-screenshots-api");
      return getWindowScreenshot(id);
    },

    async openFileDialog(options: OpenDialogOptions) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      return open(options);
    },

    async getFileMetadata(path: string) {
      const { metadata } = await import("tauri-plugin-fs-pro-api");
      return metadata(path);
    },

    async getFileIcon(path: string, size: number) {
      const { icon } = await import("tauri-plugin-fs-pro-api");
      return icon(path, size);
    },

    async checkUpdate() {
      const { check } = await import("@tauri-apps/plugin-updater");
      return check();
    },

    async relaunchApp() {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      return relaunch();
    },

    async listenThemeChanged(callback) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen("theme-changed", ({ payload }) => {
        callback(payload);
      });
    },

    async getWebviewWindow() {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      return getCurrentWebviewWindow();
    },

    async setWindowTheme(theme) {
      const window = await this.getWebviewWindow();
      if (window) {
        return window.setTheme(theme);
      }
    },

    async getWindowTheme() {
      const window = await this.getWebviewWindow();
      if (window) {
        return window.theme();
      }
      return 'light';
    },

    async onThemeChanged(callback) {
      const window = await this.getWebviewWindow();
      if (window) {
        window.onThemeChanged(callback);
      }
    },

    async getWindowByLabel(label: string) {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const window = await WebviewWindow.getByLabel(label);
      return window;
    },

    async createWindow(label: string, options: any) {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      new WebviewWindow(label, options);
    },

    async getAllWindows(): Promise<any[]> {
      const { getAllWindows } = await import("@tauri-apps/api/window");
      return getAllWindows();
    },

    async getCurrentWindow(): Promise<any> {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      return getCurrentWindow();
    },

    async createWebviewWindow(label: string, options: any): Promise<any> {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      return new WebviewWindow(label, options);
    },

    async listenWindowEvent(event: string, callback: (event: any) => void): Promise<() => void> {
      const { listen } = await import("@tauri-apps/api/event");
      return listen(event, callback);
    },

    isTauri(): boolean {
      return true;
    },

    async openExternal(url: string): Promise<void> {
      const { open } = await import("@tauri-apps/plugin-shell");
      return open(url);
    },
  };
};