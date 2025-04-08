import { createWebAdapter } from './webAdapter';
import { createTauriAdapter } from './tauriAdapter';

import { IShortcutsStore } from "@/stores/shortcutsStore";
import { IStartupStore } from "@/stores/startupStore";
import { AppTheme } from "@/utils/tauri";

export interface EventPayloads {
  "language-changed": {
    language: string;
  };
  "theme-changed": string;
  "tauri://focus": void;
  "endpoint-changed": {
    endpoint: string;
    endpoint_http: string;
    endpoint_websocket: string;
  };
  "auth-changed": {
    auth: Record<string, unknown>;
  };
  "userInfo-changed": {
    userInfo: Record<string, unknown>;
  };
  open_settings: string | "";
  tab_index: string | "";
  login_or_logout: unknown;
  'show-coco': void;
  'connector_data_change': void;
  'datasourceData_change': void;
  'ws-error': void;
  'ws-message': void;
  [key: `ws-error-${string}`]: {
    error: {
      reason: string;
    };
    status: number;
  };
  [key: `ws-message-${string}`]: string;
  "change-startup-store": IStartupStore
  "change-shortcuts-store": IShortcutsStore;
}

/**
 * Platform adapter interface for handling platform-specific operations
 * Supports both Tauri and Web environments
 */
export interface PlatformAdapter {
  invokeBackend: <T = unknown>(command: string, args?: unknown) => Promise<T>;
  setWindowSize: (width: number, height: number) => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
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
  openFileDialog: (options: {
    multiple: boolean;
  }) => Promise<string | string[] | null>;
  getFileMetadata: (path: string) => Promise<any>;
  getFileIcon: (path: string, size: number) => Promise<string>;
  checkUpdate: () => Promise<any>;
  relaunchApp: () => Promise<void>;
  listenThemeChanged: (callback: (theme: AppTheme) => void) => Promise<() => void>;
  getWebviewWindow: () => Promise<any>;
  setWindowTheme: (theme: string | null) => Promise<void>;
  getWindowTheme: () => Promise<string>;
  onThemeChanged: (
    callback: (payload: { payload: string }) => void
  ) => Promise<void>;
  getWindowByLabel: (label: string) => Promise<{
    show: () => Promise<void>;
    setFocus: () => Promise<void>;
    center: () => Promise<void>;
    close: () => Promise<void>;
  } | null>;
  createWindow: (label: string, options: any) => Promise<void>;
  getAllWindows: () => Promise<any[]>;
  getCurrentWindow: () => Promise<any>;
  createWebviewWindow: (label: string, options: any) => Promise<any>;
  listenWindowEvent: (event: string, callback: (event: any) => void) => Promise<() => void>;
  isTauri: () => boolean;
  openExternal: (url: string) => Promise<void>;
}

const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");
const isTauri = appStore.state?.isTauri ?? !!(window as any).__TAURI__;

const platformAdapter: PlatformAdapter = isTauri ? createTauriAdapter() : createWebAdapter();

export default platformAdapter;