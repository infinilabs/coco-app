import type { PlatformAdapter, EventPayloads } from './platformAdapter';

// Create Web adapter functions
export const createWebAdapter = (): PlatformAdapter => {
  return {
    async commands<T>(commandName: string, ...args: any[]): Promise<T> {
      console.warn(`Command "${commandName}" is not supported in web environment`, args);
      return Promise.reject(new Error('Not supported in web environment'));
    },

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
      return () => { };
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
      return () => { };
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

    async getAllWindows(): Promise<any[]> {
      console.log("Web mode simulated get all windows");
      return [];
    },

    async getCurrentWindow(): Promise<any> {
      console.log("Web mode simulated get current window");
      return null;
    },

    async createWebviewWindow(label: string, options: any): Promise<any> {
      console.log("Web mode simulated create webview window:", label, options);
      return null;
    },

    async listenWindowEvent(event: string, _callback: (event: any) => void): Promise<() => void> {
      console.log("Web mode simulated listen window event:", event);
      return () => {};
    },

    isTauri(): boolean {
      return false;
    },

    async openExternal(url: string): Promise<void> {
      console.log(`Web mode opening URL: ${url}`);
      window.open(url, '_blank');
    },
  };
};