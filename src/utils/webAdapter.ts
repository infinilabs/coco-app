import type { BasePlatformAdapter } from "@/types/platform";
import { copyToClipboard, OpenURLWithBrowser } from ".";
import { Post } from "@/api/axiosRequest";

export interface WebPlatformAdapter extends BasePlatformAdapter {
  // Add web-specific methods here
  openFileDialog: (options: any) => Promise<string | string[] | null>;
  metadata: (path: string, options: any) => Promise<Record<string, any>>;
  error: (message: string) => void;
}

// Create Web adapter functions
export const createWebAdapter = (): WebPlatformAdapter => {
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
      console.log("Web mode simulated window show");
      // No actual operation needed in web environment
    },

    convertFileSrc(path) {
      return path;
    },

    async emitEvent(event, payload) {
      console.log("Web mode simulated event emit", event, payload);
    },

    async listenEvent(event, _callback) {
      console.log("Web mode simulated event listen", event);
      return () => {};
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
      console.log("Web mode simulated check update");
      return null;
    },

    async relaunchApp() {
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
      return "light";
    },

    async onThemeChanged(callback) {
      console.log("Web mode simulated on theme changed", callback);
    },

    async getWindowByLabel(label) {
      console.log("Web mode simulated get window by label:", label);
      return null;
    },

    async createWindow(label, options) {
      console.log("Web mode simulated create window:", label, options);
    },

    async getAllWindows() {
      console.log("Web mode simulated get all windows");
      return [];
    },

    async getCurrentWindow() {
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

      if (data?.url) {
        return OpenURLWithBrowser(formatUrl && formatUrl(data) || data.url);
      }

      if (data?.payload?.result?.value) {
        return copyToClipboard(data.payload.result.value);
      }
    },

    error: console.error,

    async searchMCPServers(_serverId, queryParams) {
      const urlParams = new URLSearchParams();
      queryParams.forEach((param) => {
        const [key, value] = param.split("=");
        urlParams.append(key, decodeURIComponent(value));
      });

      const [error, res]: any = await Post(
        "/mcp_server/_search",
        {},
        Object.fromEntries(urlParams)
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
      const urlParams = new URLSearchParams();
      queryParams.forEach((param) => {
        const [key, value] = param.split("=");
        urlParams.append(key, decodeURIComponent(value));
      });

      const [error, res]: any = await Post(
        "/datasource/_search",
        {},
        Object.fromEntries(urlParams)
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
      const urlParams = new URLSearchParams();
      queryParams.forEach((param) => {
        const [key, value] = param.split("=");
        urlParams.append(key, decodeURIComponent(value));
      });

      const [error, res]: any = await Post(
        "/assistant/_search",
        {},
        Object.fromEntries(urlParams)
      );

      if (error) {
        console.error("_search", error);
        return {};
      }

      return res;
    },
  };
};
