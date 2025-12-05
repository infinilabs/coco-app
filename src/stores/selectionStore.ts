import { create } from 'zustand';
import { createTauriStore } from '@tauri-store/zustand';

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
  selectionEnabled: true,
  setSelectionEnabled: (selectionEnabled) => set({ selectionEnabled }),
}));

// A handle to the Tauri plugin.
// We will need this to start the store.
export const tauriHandler = createTauriStore('selection-store', useSelectionStore, {
  saveOnChange: true,
  autoStart: true,
});
