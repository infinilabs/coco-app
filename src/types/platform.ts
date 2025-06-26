import { IAppearanceStore } from "@/stores/appearanceStore";
import { IConnectStore } from "@/stores/connectStore";
import { IExtensionsStore } from "@/stores/extensionsStore";
import { IShortcutsStore } from "@/stores/shortcutsStore";
import { IStartupStore } from "@/stores/startupStore";
import { AppTheme } from "@/types/index";
import { SearchDocument } from "./search";
import { IAppStore } from "@/stores/appStore";

export interface EventPayloads {
  "theme-changed": string;
  "tauri://focus": void;
  "endpoint-changed": {
    endpoint: string;
    endpoint_http: string;
    endpoint_websocket: string;
  };
  "showTooltip-changed": {
    showTooltip: boolean;
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
  "show-coco": void;
  connector_data_change: void;
  datasourceData_change: void;
  "ws-error": void;
  "ws-message": void;
  [key: `ws-error-${string}`]: string;
  [key: `ws-message-${string}`]: string;
  [key: `ws-cancel-${string}`]: string;
  "change-startup-store": IStartupStore;
  "change-shortcuts-store": IShortcutsStore;
  "change-connect-store": IConnectStore;
  "change-appearance-store": IAppearanceStore;
  "toggle-to-chat-mode": void;
  "change-extensions-store": IExtensionsStore;
  "quick-ai-access-client-id": any;
  "ai-overview-client-id": any;
  "change-app-store": IAppStore;
  "open-extension-store": void;
  "install-extension": void;
  "uninstall-extension": void;
  "config-extension": string;
}

// Window operation interface
export interface WindowOperations {
  setWindowSize: (width: number, height: number) => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
  setAlwaysOnTop: (isPinned: boolean) => Promise<void>;
  setShadow(enable: boolean): Promise<void>;
  getWebviewWindow: () => Promise<any>;
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
  listenWindowEvent: (
    event: string,
    callback: (event: any) => void
  ) => Promise<() => void>;
}

// Theme and event related interface
export interface ThemeAndEvents {
  emitEvent: <K extends keyof EventPayloads>(
    event: K,
    payload?: any
  ) => Promise<void>;
  listenEvent: <K extends keyof EventPayloads>(
    event: K,
    callback: (event: { payload: EventPayloads[K] }) => void
  ) => Promise<() => void>;
  setWindowTheme: (theme: string | null) => Promise<void>;
  getWindowTheme: () => Promise<string>;
  onThemeChanged: (
    callback: (payload: { payload: string }) => void
  ) => Promise<void>;
  listenThemeChanged: (
    callback: (theme: AppTheme) => void
  ) => Promise<() => void>;
}

// System operations interface
export interface SystemOperations {
  invokeBackend: <T = unknown>(command: string, args?: any) => Promise<T>;
  convertFileSrc: (path: string) => string;
  checkScreenRecordingPermission: () => Promise<boolean>;
  requestScreenRecordingPermission: () => void;
  getScreenshotableMonitors: () => Promise<any[]>;
  getScreenshotableWindows: () => Promise<any[]>;
  captureMonitorScreenshot: (id: number) => Promise<string>;
  captureWindowScreenshot: (id: number) => Promise<string>;
  getFileMetadata: (path: string) => Promise<any>;
  getFileIcon: (path: string, size: number) => Promise<string>;
  checkUpdate: () => Promise<any>;
  relaunchApp: () => Promise<void>;
  isTauri: () => boolean;
  openUrl: (url: string) => Promise<unknown>;
  commands: <T>(commandName: string, ...args: any[]) => Promise<T>;
  isWindows10: () => Promise<boolean>;
  revealItemInDir: (path: string) => Promise<unknown>;
  openSearchItem: (data: SearchDocument) => Promise<unknown>;
}

// Base platform adapter interface
export interface BasePlatformAdapter
  extends WindowOperations,
    ThemeAndEvents,
    SystemOperations {}
