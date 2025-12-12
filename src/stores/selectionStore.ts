import { create } from "zustand";
import platformAdapter from "@/utils/platformAdapter";

type IconConfig =
  | { type: "lucide"; name: string; color?: string }
  | { type: "custom"; dataUrl: string; color?: string };

export type ButtonConfig = {
  id: string;
  label: string;
  icon: IconConfig;
  action: {
    type: string;
    assistantId?: string;
    assistantServerId?: string;
    eventName?: string;
  };
  labelKey?: string;
};

type SelectionStore = {
  iconsOnly: boolean;
  setIconsOnly: (iconsOnly: boolean) => void;
  toolbarConfig: ButtonConfig[];
  setToolbarConfig: (config: ButtonConfig[]) => void;
  selectionEnabled: boolean;
  setSelectionEnabled: (enabled: boolean) => void;
}

// A Zustand store, like any other.
export const useSelectionStore = create<SelectionStore>((set) => ({
  iconsOnly: false,
  setIconsOnly: (iconsOnly) => set({ iconsOnly }),
  toolbarConfig: [],
  setToolbarConfig: (toolbarConfig) => set({ toolbarConfig }),
  selectionEnabled: false,
  setSelectionEnabled: (selectionEnabled) => set({ selectionEnabled }),
}));

/**
 * Initialize Selection store persistence on Tauri only.
 * In Web mode, this is a no-op to avoid loading Tauri-specific plugins.
 *
 * Returns a promise that resolves when persistence has been started on Tauri.
 */
export async function startSelectionStorePersistence(): Promise<void> {
  if (!platformAdapter.isTauri()) return;

  const { createTauriStore } = await import("@tauri-store/zustand");
  createTauriStore("selection-store", useSelectionStore, {
    saveOnChange: true,
    autoStart: true,
  });
}
