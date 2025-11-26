import type { BasePlatformAdapter } from "@/types/platform";
import { copyToClipboard, OpenURLWithBrowser } from ".";
import { Post } from "@/api/axiosRequest";

export interface WebPlatformAdapter extends BasePlatformAdapter {
  // Add web-specific methods here
  openFileDialog: (options: any) => Promise<string | string[] | null>;
  metadata: (path: string, options: any) => Promise<Record<string, any>>;
  error: (message: string) => void;
  openLogDir: () => Promise<void>;
  getCurrentWebviewWindow: () => Promise<any>;
  getWindowTheme: () => Promise<string>;
  setWindowTheme: (theme: string | null) => Promise<void>;
  getAllWindows: () => Promise<any[]>;
}

// Create Web adapter functions
export const createWebAdapter = (): WebPlatformAdapter => {
  // Simple in-page event bus using CustomEvent
  const emitCustomEvent = (event: string, payload?: any) => {
    try {
      const ce = new CustomEvent(event, { detail: payload });
      window.dispatchEvent(ce);
    } catch (e) {
      console.warn("Web event emit failed", event, e);
    }
  };

  const listenCustomEvent = (event: string, callback: Function) => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      try {
        callback({ payload: ce.detail });
      } catch (err) {
        console.warn("Web event callback error", event, err);
      }
    };
    window.addEventListener(event, handler as EventListener);
    return () => window.removeEventListener(event, handler as EventListener);
  };

  return {
    async commands(commandName, ...args) {
      console.warn(
        `Command "${commandName}" is not supported in web environment`,
        args
      );
      return Promise.reject(new Error("Not supported in web environment"));
    },

    async invokeBackend(command, args) {
      console.log(`Web mode simulated backend call: ${command}`, args);
      // Implement web environment simulation logic or API calls here
      return null as any;
    },

    async setWindowSize(width, height) {
      console.log(`Web mode simulated window resize: ${width}x${height}`);
      // No actual operation needed in web environment
    },

    async hideWindow() {
      console.log("Web mode simulated window hide");
      // No actual operation needed in web environment
    },

    async showWindow() {
      try {
        if (!location.pathname.startsWith("/ui")) {
          window.location.href = "/ui";
        }
      } catch (e) {
        console.warn("Web showWindow navigation failed", e);
      }
    },

    convertFileSrc(path) {
      return path;
    },

    async emitEvent(event, payload) {
      emitCustomEvent(event, payload);
    },

    async listenEvent(event, callback) {
      return Promise.resolve(listenCustomEvent(event, callback));
    },

    async setAlwaysOnTop(isPinned) {
      console.log("Web mode simulated set always on top", isPinned);
    },

    async checkScreenRecordingPermission() {
      console.log("Web mode simulated check screen recording permission");
      return false;
    },

    async checkMicrophonePermission() {
      return false;
    },

    async requestMicrophonePermission() {
      return false;
    },

    requestScreenRecordingPermission() {
      console.log("Web mode simulated request screen recording permission");
    },

    async getScreenshotableMonitors() {
      console.log("Web mode simulated get screenshotable monitors");
      return [];
    },

    async getScreenshotableWindows() {
      console.log("Web mode simulated get screenshotable windows");
      return [];
    },

    async captureMonitorScreenshot(id) {
      console.log("Web mode simulated capture monitor screenshot", id);
      return "";
    },

    async captureWindowScreenshot(id) {
      console.log("Web mode simulated capture window screenshot", id);
      return "";
    },

    async openFileDialog(options) {
      console.log("Web mode simulated open file dialog", options);
      return null;
    },

    async getFileMetadata(path) {
      console.log("Web mode simulated get file metadata", path);
      return null;
    },

    async getFileIcon(path, size) {
      console.log("Web mode simulated get file icon", path, size);
      return "";
    },

    async checkUpdate() {
      return null;
    },

    async relaunchApp() {
      console.log("Web mode simulated relaunch app");
    },

    async listenThemeChanged() {
      console.log("Web mode simulated theme change listener");
      return () => {};
    },

    async setWindowTheme(theme) {
      console.log("Web mode simulated set window theme:", theme);
    },

    async getWindowTheme() {
      console.log("Web mode simulated get window theme");
      return "light";
    },

    async onThemeChanged(callback) {
      console.log("Web mode simulated on theme changed", callback);
    },

    async getWindowByLabel(label) {
      console.log("Web getWindowByLabel:", label);
      return null;
    },

    async createWindow(_label, options) {
      const url = options?.url || "/";
      try {
        window.location.href = url;
      } catch (e) {
        console.warn("Web navigate failed", url, e);
      }
    },

    async getAllWindows() {
      console.log("Web mode simulated get all windows");
      return [];
    },

    async getCurrentWebviewWindow() {
      console.log("Web mode simulated get current window");
      return null;
    },

    async createWebviewWindow(label, options) {
      console.log("Web mode simulated create webview window:", label, options);
      return null;
    },

    async listenWindowEvent(event, _callback) {
      console.log("Web mode simulated listen window event:", event);
      return () => {};
    },

    isTauri() {
      return false;
    },

    async openUrl(url) {
      console.log(`Web mode opening URL: ${url}`);
      window.open(url, "_blank");
    },

    isWindows10: async () => false,

    async setShadow(enable) {
      console.log("setShadow is not supported in web environment", enable);
      return Promise.resolve();
    },

    async metadata(path, options = {}) {
      console.log(
        "metadata is not supported in web environment",
        path,
        options
      );
      return Promise.resolve({ isAbsolute: false });
    },

    async revealItemInDir(path) {
      console.log("revealItemInDir is not supported in web environment", path);
    },

    async openSearchItem(data, formatUrl) {
      if (data.type === "AI Assistant") {
        return;
      }

      const url = (formatUrl && formatUrl(data)) || data.url;
      if (url) {
        return OpenURLWithBrowser(url);
      }

      if (data?.payload?.result?.value) {
        return copyToClipboard(data.payload.result.value);
      }
    },

    error: console.error,

    async searchMCPServers(_serverId, queryParams) {
      const [error, res]: any = await Post(
        `/mcp_server/_search?${queryParams?.join("&")}`,
        undefined
      );

      if (error) {
        console.error("_search", error);
        return [];
      }

      return (
        res?.hits?.hits?.map((item: any) => ({
          ...item,
          id: item._source.id,
          name: item._source.name,
        })) || []
      );
    },

    async searchDataSources(_serverId, queryParams) {
      const [error, res]: any = await Post(
        `/datasource/_search?${queryParams?.join("&")}`,
        undefined
      );

      if (error) {
        console.error("_search", error);
        return [];
      }

      return (
        res?.hits?.hits?.map((item: any) => ({
          ...item,
          id: item._source.id,
          name: item._source.name,
        })) || []
      );
    },

    async fetchAssistant(_serverId, queryParams) {
      const [error, res]: any = await Post(
        `/assistant/_search?${queryParams?.join("&")}`,
        undefined
      );
      if (error) {
        console.error("_search", error);
        return {};
      }
      return res;
    },

    async getCurrentWindowLabel() {
      return "web";
    },

    async openLogDir() {
      console.log("openLogDir is not supported in web environment");
      return Promise.resolve();
    },
  };
};
