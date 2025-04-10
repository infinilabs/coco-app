import type { OpenDialogOptions } from '@tauri-apps/plugin-dialog';
import { isWindows10 } from "tauri-plugin-windows-version-api";

import { windowWrapper, eventWrapper, systemWrapper, commandWrapper } from './wrappers/tauriWrappers';
import type { PlatformAdapter, EventPayloads } from './platformAdapter';
import type { AppTheme } from "@/types/index";

// Create Tauri adapter functions
export const createTauriAdapter = (): PlatformAdapter => {
  return {
    async setWindowSize(width: number, height: number) {
      return windowWrapper.setSize(width, height);
    },

    async hideWindow() {
      const window = await windowWrapper.getWebviewWindow();
      return window?.hide();
    },

    async showWindow() {
      const window = await windowWrapper.getWebviewWindow();
      return window?.show();
    },

    async emitEvent(event: string, payload?: any) {
      return eventWrapper.emit(event, payload);
    },

    async listenEvent<K extends keyof EventPayloads>(
      event: K,
      callback: (event: { payload: EventPayloads[K] }) => void
    ) {
      return eventWrapper.listen(event, callback);
    },

    async checkScreenRecordingPermission() {
      return systemWrapper.checkScreenPermission();
    },

    async captureMonitorScreenshot(id: number) {
      return systemWrapper.captureScreen(id, 'monitor');
    },

    async captureWindowScreenshot(id: number) {
      return systemWrapper.captureScreen(id, 'window');
    },

    commands: commandWrapper.commands,

    async invokeBackend(command: string, args?: any): Promise<any> {
      const { invoke } = await import("@tauri-apps/api/core");
      return invoke(command, args);
    },

    convertFileSrc(path: string): string {
      const { convertFileSrc } = require("@tauri-apps/api/core");
      return convertFileSrc(path);
    },

    async setAlwaysOnTop(isPinned: boolean) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const window = getCurrentWindow();
      return window.setAlwaysOnTop(isPinned);
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

    async listenThemeChanged(callback: (theme: AppTheme) => void) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen<AppTheme>("theme-changed", ({ payload }) => {
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

    isWindows10: isWindows10
  };
};