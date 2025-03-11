import { useState, useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";

// Platform adapter interface
export interface PlatformAdapter {
  invokeBackend: (command: string, args?: any) => Promise<any>;
  setWindowSize: (width: number, height: number) => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
  isPlatformTauri: () => boolean;
}

// Check if running in Tauri environment
export const checkIsTauri = (): boolean => {
  try {
    return typeof window !== 'undefined' && isTauri();
  } catch (e) {
    return false;
  }
};

// Create Tauri adapter functions
export const createTauriAdapter = (): PlatformAdapter => {
  return {
    async invokeBackend(command: string, args?: any): Promise<any> {
      if (checkIsTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        return invoke(command, args);
      }
      return null;
    },

    async setWindowSize(width: number, height: number): Promise<void> {
      if (checkIsTauri()) {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const { LogicalSize } = await import("@tauri-apps/api/dpi");
        const window = await getCurrentWebviewWindow();
        if (window) {
          await window.setSize(new LogicalSize(width, height));
        }
      }
    },

    async hideWindow(): Promise<void> {
      if (checkIsTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("hide_coco");
      }
    },

    async showWindow(): Promise<void> {
      if (checkIsTauri()) {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const window = await getCurrentWebviewWindow();
        if (window) {
          await window.show();
        }
      }
    },

    isPlatformTauri(): boolean {
      return checkIsTauri();
    }
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
    }
  };
};

// Create platform adapter based on environment
export const createPlatformAdapter = (): PlatformAdapter => {
  try {
    if (checkIsTauri()) {
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