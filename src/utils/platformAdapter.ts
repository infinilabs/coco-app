import { createWebAdapter } from './webAdapter';
// import { createTauriAdapter } from './tauriAdapter';

import { IShortcutsStore } from "@/stores/shortcutsStore";
import { IStartupStore } from "@/stores/startupStore";

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
    auth: {
      [key: string]: any;
    };
  };
  "userInfo-changed": {
    userInfo: {
      [key: string]: any;
    };
  };
  open_settings: string | "";
  tab_index: string | "";
  login_or_logout: any;
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

// Platform adapter interface
export interface PlatformAdapter {
  invokeBackend: (command: string, args?: any) => Promise<any>;
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
  listenThemeChanged: (callback: (theme: any) => void) => Promise<() => void>;
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

const loadAdapter = async () => {
  const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");
  console.log("isTauri", appStore.state?.isTauri)

  let isTauri = appStore.state?.isTauri;
  if (isTauri) {
    const { createTauriAdapter } = await import('./tauriAdapter');
    return createTauriAdapter();
  }
  return createWebAdapter();
};

// Default adapter instance
const platformAdapter: PlatformAdapter = typeof window !== 'undefined' ? await loadAdapter() : {} as PlatformAdapter;

export default platformAdapter;