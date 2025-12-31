import { create } from "zustand";

import platformAdapter from "@/utils/platformAdapter";
import {
  ExtensionPermission,
  ViewExtensionUISettings,
} from "@/components/Settings/Extensions";

export type ViewExtensionOpened = [
  // Extension name
  string,
  // An absolute path to the extension icon or a font code.
  string,
  // HTML file URL
  string,
  ExtensionPermission | null,
  ViewExtensionUISettings | null
];

type ExtensionStore = {
  // A stack of opened view extensions. The last one is the active one.
  viewExtensions: ViewExtensionOpened[];
  
  // Actions
  addViewExtension: (viewExtension: ViewExtensionOpened) => void;
  closeViewExtension: () => void;
  
  // Helper to clear all extensions (optional, for resetting)
  clearViewExtensions: () => void;

  // Deprecated: use addViewExtension or closeViewExtension
  // We keep the setter signature but it will act on the stack.
  // This is to make refactoring easier, but ideally we should rename usages.
  setViewExtensionOpened: (showViewExtension?: ViewExtensionOpened) => void;
}

// A Zustand store, like any other.
export const useExtensionStore = create<ExtensionStore>((set) => ({
  viewExtensions: [],
  
  addViewExtension: (viewExtension) => {
    set((state) => {
      // Ensure uniqueness by name (index 0).
      // If it exists, remove it first so the new one is added to the end (top of stack).
      const name = viewExtension[0];
      const others = state.viewExtensions.filter((ext) => ext[0] !== name);
      
      return { 
        viewExtensions: [...others, viewExtension] 
      };
    });
  },
  
  closeViewExtension: () => {
    set((state) => {
      if (state.viewExtensions.length === 0) return {};
      return { viewExtensions: state.viewExtensions.slice(0, -1) };
    });
  },
  
  clearViewExtensions: () => {
    set({ viewExtensions: [] });
  },
  
  // Compatibility adapter
  setViewExtensionOpened: (viewExtensionOpened) => {
    if (viewExtensionOpened) {
      set((state) => {
        // Same uniqueness logic as addViewExtension
        const name = viewExtensionOpened[0];
        const others = state.viewExtensions.filter((ext) => ext[0] !== name);
        
        return { 
          viewExtensions: [...others, viewExtensionOpened] 
        };
      });
    } else {
      set((state) => {
          if (state.viewExtensions.length === 0) return {};
          return { viewExtensions: state.viewExtensions.slice(0, -1) };
      });
    }
  },
}));

/**
 * Initialize Extension store persistence on Tauri only.
 * In Web mode, this is a no-op to avoid loading Tauri-specific plugins.
 *
 * Returns a promise that resolves when persistence has been started on Tauri.
 */
export async function startExtensionStorePersistence(): Promise<void> {
  if (!platformAdapter.isTauri()) return;

  const { createTauriStore } = await import("@tauri-store/zustand");
  createTauriStore("extension-store", useExtensionStore, {
    saveOnChange: true,
    autoStart: true,
  });
}
