import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

export interface EventPayloads {
  'language-changed': {
    language: string;
  };
  'theme-changed': string;
  'tauri://focus': void;
  'endpoint-changed': {
    endpoint: string;
    endpoint_http: string;
    endpoint_websocket: string;
  };
  'auth-changed': {
    auth: {
      [key: string]: any;
    };
  };
  'userInfo-changed': {
    userInfo: {
      [key: string]: any;
    };
  };
  'open_settings': string | '';
  'tab_index': string | '';
  'login_or_logout': any;
  'change-startup-store': {
    defaultStartupWindow: string;
  };
  'show-coco': void;
}

// Platform adapter interface
export interface PlatformAdapter {
  invokeBackend: (command: string, args?: any) => Promise<any>;
  setWindowSize: (width: number, height: number) => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
  isPlatformTauri: () => boolean;
  convertFileSrc: (path: string) => string;
  emitEvent: (event: string, payload?: any) => Promise<void>;
  listenEvent: <K extends keyof EventPayloads>(
    event: K,
    callback: (event: { payload: EventPayloads[K] }) => void
  ) => Promise<() => void>;
  setAlwaysOnTop: (isPinned: boolean) => Promise<void>;
  checkScreenRecordingPermission: () => Promise<boolean>;
  requestScreenRecordingPermission: () => void;
  getScreenshotableMonitors: () => Promise<any[]>;
  getScreenshotableWindows: () => Promise<any[]>;
  captureMonitorScreenshot: (id: number) => Promise<string>;
  captureWindowScreenshot: (id: number) => Promise<string>;
  openFileDialog: (options: { multiple: boolean }) => Promise<string | string[] | null>;
  getFileMetadata: (path: string) => Promise<any>;
  getFileIcon: (path: string, size: number) => Promise<string>;
  checkUpdate: () => Promise<any>;
  relaunchApp: () => Promise<void>;
  listenThemeChanged: (callback: (theme: any) => void) => Promise<() => void>;
  getWebviewWindow: () => Promise<any>;
  setWindowTheme: (theme: string | null) => Promise<void>;
  getWindowTheme: () => Promise<string>;
  onThemeChanged: (callback: (payload: { payload: string }) => void) => Promise<void>;
  getWindowByLabel: (label: string) => Promise<{
    show: () => Promise<void>;
    setFocus: () => Promise<void>;
    center: () => Promise<void>;
  } | null>;
  createWindow: (label: string, options: any) => Promise<void>;
}

// Create Tauri adapter functions
export const createTauriAdapter = (): PlatformAdapter => {
  return {
    async invokeBackend(command: string, args?: any): Promise<any> {
      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        return invoke(command, args);
      }
      return null;
    },

    async setWindowSize(width: number, height: number): Promise<void> {
      if (isTauri()) {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const { LogicalSize } = await import("@tauri-apps/api/dpi");
        const window = await getCurrentWebviewWindow();
        if (window) {
          await window.setSize(new LogicalSize(width, height));
        }
      }
    },

    async hideWindow(): Promise<void> {
      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("hide_coco");
      }
    },

    async showWindow(): Promise<void> {
      if (isTauri()) {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const window = await getCurrentWebviewWindow();
        if (window) {
          await window.show();
        }
      }
    },

    isPlatformTauri(): boolean {
      return isTauri();
    },

    convertFileSrc(path: string): string {
      if (isTauri()) {
        const { convertFileSrc } = require("@tauri-apps/api/core");
        return convertFileSrc(path);
      }
      return path;
    },

    async emitEvent(event: string, payload?: any) {
      if (isTauri()) {
        const { emit } = await import("@tauri-apps/api/event");
        return emit(event, payload);
      }
    },

    async listenEvent<K extends keyof EventPayloads>(
      event: K,
      callback: (event: { payload: EventPayloads[K] }) => void
    ) {
      if (isTauri()) {
        const { listen } = await import("@tauri-apps/api/event");
        return listen(event, callback);
      }
      return () => {};
    },

    async setAlwaysOnTop(isPinned: boolean) {
      if (isTauri()) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const window = getCurrentWindow();
        return window.setAlwaysOnTop(isPinned);
      }
    },

    async checkScreenRecordingPermission() {
      if (isTauri()) {
        const { checkScreenRecordingPermission } = await import("tauri-plugin-macos-permissions-api");
        return checkScreenRecordingPermission();
      }
      return false;
    },

    async requestScreenRecordingPermission() {
      if (isTauri()) {
        const { requestScreenRecordingPermission } = await import("tauri-plugin-macos-permissions-api"); 
        return requestScreenRecordingPermission();
      }
    },

    async getScreenshotableMonitors() {
      if (isTauri()) {
        const { getScreenshotableMonitors } = await import("tauri-plugin-screenshots-api");
        return getScreenshotableMonitors();
      }
      return [];
    },

    async getScreenshotableWindows() {
      if (isTauri()) {
        const { getScreenshotableWindows } = await import("tauri-plugin-screenshots-api");
        return getScreenshotableWindows();
      }
      return [];
    },

    async captureMonitorScreenshot(id: number) {
      if (isTauri()) {
        const { getMonitorScreenshot } = await import("tauri-plugin-screenshots-api");
        return getMonitorScreenshot(id);
      }
      return "";
    },

    async captureWindowScreenshot(id: number) {
      if (isTauri()) {
        const { getWindowScreenshot } = await import("tauri-plugin-screenshots-api");
        return getWindowScreenshot(id);
      }
      return "";
    },

    async openFileDialog(options: { multiple: boolean }) {
      if (isTauri()) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        return open(options);
      }
      return null;
    },

    async getFileMetadata(path: string) {
      if (isTauri()) {
        const { metadata } = await import("tauri-plugin-fs-pro-api");
        return metadata(path);
      }
      return null;
    },

    async getFileIcon(path: string, size: number) {
      if (isTauri()) {
        const { icon } = await import("tauri-plugin-fs-pro-api");
        return icon(path, size);
      }
      return "";
    },

    async checkUpdate() {
      if (isTauri()) {
        const { check } = await import("@tauri-apps/plugin-updater");
        return check();
      }
      return null;
    },

    async relaunchApp() {
      if (isTauri()) {
        const { relaunch } = await import("@tauri-apps/plugin-process");
        return relaunch();
      }
    },

    async listenThemeChanged(callback) {
      if (isTauri()) {
        const { listen } = await import("@tauri-apps/api/event");
        return listen("theme-changed", ({ payload }) => {
          callback(payload);
        });
      }
      return () => {};
    },

    async getWebviewWindow() {
      if (isTauri()) {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        return getCurrentWebviewWindow();
      }
      return null;
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
      if (isTauri()) {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const window = await WebviewWindow.getByLabel(label);
        return window;
      }
      return null;
    },

    async createWindow(label: string, options: any) {
      if (isTauri()) {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        new WebviewWindow(label, options);
      }
    },
  };
};

// Create Web adapter functions
export const createWebAdapter = (): PlatformAdapter => {
  return {
    async invokeBackend(command: string, args?: any): Promise<any> {
      console.log(`Web mode simulated backend call: ${command}`, args);
      // Implement web environment simulation logic or API calls here
      return null;
    },

    async setWindowSize(width: number, height: number): Promise<void> {
      console.log(`Web mode simulated window resize: ${width}x${height}`);
      // No actual operation needed in web environment
    },

    async hideWindow(): Promise<void> {
      console.log("Web mode simulated window hide");
      // No actual operation needed in web environment
    },

    async showWindow(): Promise<void> {
      console.log("Web mode simulated window show");
      // No actual operation needed in web environment
    },

    isPlatformTauri(): boolean {
      return false;
    },

    convertFileSrc(path: string): string {
      return path;
    },

    async emitEvent(event: string, payload?: any): Promise<void> {
      console.log("Web mode simulated event emit", event, payload);
    },

    async listenEvent<K extends keyof EventPayloads>(
      event: K,
      _callback: (event: { payload: EventPayloads[K] }) => void
    ): Promise<() => void> {
      console.log("Web mode simulated event listen", event);
      return () => {};
    },

    async setAlwaysOnTop(isPinned: boolean): Promise<void> {
      console.log("Web mode simulated set always on top", isPinned);
    },

    async checkScreenRecordingPermission(): Promise<boolean> {
      console.log("Web mode simulated check screen recording permission");
      return false;
    },

    requestScreenRecordingPermission(): void {
      console.log("Web mode simulated request screen recording permission");
    },

    async getScreenshotableMonitors(): Promise<any[]> {
      console.log("Web mode simulated get screenshotable monitors");
      return [];
    },

    async getScreenshotableWindows(): Promise<any[]> {
      console.log("Web mode simulated get screenshotable windows");
      return [];
    },

    async captureMonitorScreenshot(id: number): Promise<string> {
      console.log("Web mode simulated capture monitor screenshot", id);
      return "";
    },

    async captureWindowScreenshot(id: number): Promise<string> {
      console.log("Web mode simulated capture window screenshot", id);
      return "";
    },

    async openFileDialog(options: { multiple: boolean }): Promise<null> {
      console.log("Web mode simulated open file dialog", options);
      return null;
    },

    async getFileMetadata(path: string): Promise<null> {
      console.log("Web mode simulated get file metadata", path);
      return null;
    },

    async getFileIcon(path: string, size: number): Promise<string> {
      console.log("Web mode simulated get file icon", path, size);
      return "";
    },

    async checkUpdate(): Promise<any> {
      console.log("Web mode simulated check update");
      return null;
    },

    async relaunchApp(): Promise<void> {
      console.log("Web mode simulated relaunch app");
    },

    async listenThemeChanged() {
      console.log("Web mode simulated theme change listener");
      return () => {};
    },

    async getWebviewWindow() {
      console.log("Web mode simulated get webview window");
      return null;
    },

    async setWindowTheme(theme) {
      console.log("Web mode simulated set window theme:", theme);
    },

    async getWindowTheme() {
      console.log("Web mode simulated get window theme");
      return 'light';
    },

    async onThemeChanged(callback) {
      console.log("Web mode simulated on theme changed", callback);
    },

    async getWindowByLabel(label: string) {
      console.log("Web mode simulated get window by label:", label);
      return null;
    },

    async createWindow(label: string, options: any) {
      console.log("Web mode simulated create window:", label, options);
    },
  };
};

// Create platform adapter based on environment
export const createPlatformAdapter = (): PlatformAdapter => {
  try {
    if (isTauri()) {
      return createTauriAdapter();
    } else {
      return createWebAdapter();
    }
  } catch (e) {
    return createWebAdapter();
  }
};

// Default adapter instance
const platformAdapter = createPlatformAdapter();

export default platformAdapter;

// Custom hook for using platform adapter
export const usePlatformAdapter = () => {
  const [adapter] = useState<PlatformAdapter>(platformAdapter);
  
  return adapter;
};