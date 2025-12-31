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
  // When we open a View extension, we set this to a non-null value.
  viewExtensionOpened?: ViewExtensionOpened;
  setViewExtensionOpened: (showViewExtension?: ViewExtensionOpened) => void;
}

// A Zustand store, like any other.
export const useExtensionStore = create<ExtensionStore>((set) => ({
  setViewExtensionOpened: (viewExtensionOpened) => {
    return set({ viewExtensionOpened });
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
