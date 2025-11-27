import { create } from 'zustand';
import { createTauriStore } from '@tauri-store/zustand';

// Types adapted from Selection/index.tsx to ensure compatibility
export type LucideIconName =
  | "Search"
  | "Bot"
  | "Languages"
  | "FileText"
  | "Copy"
  | "Volume2";

type IconConfig =
  | { type: "lucide"; name: LucideIconName; color?: string }
  | { type: "custom"; dataUrl: string; color?: string };

type ActionType =
  | "search"
  | "ask_ai"
  | "translate"
  | "summary"
  | "copy"
  | "speak"
  | "custom";

export type ButtonConfig = {
  id: string;
  label: string;
  icon: IconConfig;
  action: {
    type: ActionType;
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

  // You can also debounce or throttle when saving.
  // This is optional. The default behavior is to save immediately.
  saveStrategy: 'debounce',
  saveInterval: 1000,

  syncStrategy: 'debounce',
  syncInterval: 1000,
});
