import type { OpenDialogOptions } from "@tauri-apps/plugin-dialog";
import { isWindows10 } from "tauri-plugin-windows-version-api";
import { convertFileSrc } from "@tauri-apps/api/core";
import { metadata } from "tauri-plugin-fs-pro-api";

import {
  windowWrapper,
  eventWrapper,
  systemWrapper,
  commandWrapper,
} from "./wrappers/tauriWrappers";
import type { BasePlatformAdapter } from "@/types/platform";
import type { AppTheme } from "@/types/index";
import { useAppStore } from "@/stores/appStore";
import { useAppearanceStore } from "@/stores/appearance";

export interface TauriPlatformAdapter extends BasePlatformAdapter {
  openFileDialog: (
    options: OpenDialogOptions
  ) => Promise<string | string[] | null>;
  metadata: typeof metadata;
}

// Create Tauri adapter functions
export const createTauriAdapter = (): TauriPlatformAdapter => {
  return {
    async setWindowSize(width, height) {
      return windowWrapper.setSize(width, height);
    },

    async hideWindow() {
      const isPinned = useAppStore.getState().isPinned;

      if (isPinned) return;

      const window = await windowWrapper.getWebviewWindow();
      return window?.hide();
    },

    async showWindow() {
      const window = await windowWrapper.getWebviewWindow();
      return window?.show();
    },

    async emitEvent(event, payload) {
      return eventWrapper.emit(event, payload);
    },

    async listenEvent(event, callback) {
      return eventWrapper.listen(event, callback);
    },

    async checkScreenRecordingPermission() {
      return systemWrapper.checkScreenPermission();
    },

    async captureMonitorScreenshot(id) {
      return systemWrapper.captureScreen(id, "monitor");
    },

    async captureWindowScreenshot(id) {
      return systemWrapper.captureScreen(id, "window");
    },

    commands: commandWrapper.commands,

    async invokeBackend(command, args) {
      const { invoke } = await import("@tauri-apps/api/core");
      return invoke(command, args);
    },

    convertFileSrc(path) {
      return convertFileSrc(path);
    },

    async setAlwaysOnTop(isPinned) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const window = getCurrentWindow();
      return window.setAlwaysOnTop(isPinned);
    },

    async requestScreenRecordingPermission() {
      const { requestScreenRecordingPermission } = await import(
        "tauri-plugin-macos-permissions-api"
      );
      return requestScreenRecordingPermission();
    },

    async getScreenshotableMonitors() {
      const { getScreenshotableMonitors } = await import(
        "tauri-plugin-screenshots-api"
      );
      return getScreenshotableMonitors();
    },

    async getScreenshotableWindows() {
      const { getScreenshotableWindows } = await import(
        "tauri-plugin-screenshots-api"
      );
      return getScreenshotableWindows();
    },

    async openFileDialog(options) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      return open(options);
    },

    async getFileMetadata(path) {
      const { metadata } = await import("tauri-plugin-fs-pro-api");
      return metadata(path);
    },

    async getFileIcon(path, size) {
      const { icon } = await import("tauri-plugin-fs-pro-api");
      return icon(path, { size });
    },

    async checkUpdate() {
      const { check } = await import("@tauri-apps/plugin-updater");

      const { snapshotUpdate } = useAppearanceStore.getState();

      const endpoints = [
        "https://release.infinilabs.com/coco/app/.latest.json?target={{target}}&arch={{arch}}&current_version={{current_version}}",
      ];

      if (snapshotUpdate) {
        endpoints.unshift(
          "https://release.infinilabs.com/coco/app/snapshot/.latest.json?target={{target}}&arch={{arch}}&current_version={{current_version}}"
        );
      }

      return check({
        endpoints,
      });
    },

    async relaunchApp() {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      return relaunch();
    },

    async listenThemeChanged(callback) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen<AppTheme>("theme-changed", ({ payload }) => {
        callback(payload);
      });
    },

    async getWebviewWindow() {
      const { getCurrentWebviewWindow } = await import(
        "@tauri-apps/api/webviewWindow"
      );
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
      return "light";
    },

    async onThemeChanged(callback) {
      const window = await this.getWebviewWindow();
      if (window) {
        window.onThemeChanged(callback);
      }
    },

    async getWindowByLabel(label) {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const window = await WebviewWindow.getByLabel(label);
      return window;
    },

    async createWindow(label, options) {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      new WebviewWindow(label, options);
    },

    async getAllWindows() {
      const { getAllWindows } = await import("@tauri-apps/api/window");
      return getAllWindows();
    },

    async getCurrentWindow() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      return getCurrentWindow();
    },

    async createWebviewWindow(label, options) {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      return new WebviewWindow(label, options);
    },

    async listenWindowEvent(event, callback) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen(event, callback);
    },

    isTauri() {
      return true;
    },

    async openExternal(url) {
      const { invoke } = await import("@tauri-apps/api/core");
      return invoke("open", { path: url });
    },

    isWindows10,

    async setShadow(enable) {
      const { getCurrentWebviewWindow } = await import(
        "@tauri-apps/api/webviewWindow"
      );
      const appWindow = getCurrentWebviewWindow();
      return appWindow.setShadow(enable);
    },

    metadata,
  };
};
