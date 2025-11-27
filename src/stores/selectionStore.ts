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

const DEFAULT_CONFIG: ButtonConfig[] = [
  {
    id: "search",
    label: "搜索",
    labelKey: "selection.actions.search",
    icon: { type: "lucide", name: "Search", color: "#6366F1" },
    action: { type: "search" },
  },
  {
    id: "ask_ai",
    label: "问答",
    labelKey: "selection.actions.ask_ai",
    icon: { type: "lucide", name: "Bot", color: "#0287FF" },
    action: { type: "ask_ai" },
  },
  {
    id: "translate",
    label: "翻译",
    labelKey: "selection.actions.translate",
    icon: { type: "lucide", name: "Languages", color: "#14B8A6" },
    action: { type: "translate" },
  },
  {
    id: "summary",
    label: "总结",
    labelKey: "selection.actions.summary",
    icon: { type: "lucide", name: "FileText", color: "#0EA5E9" },
    action: { type: "summary" },
  },
  {
    id: "copy",
    label: "复制",
    labelKey: "selection.actions.copy",
    icon: { type: "lucide", name: "Copy", color: "#64748B" },
    action: { type: "copy" },
  },
  {
    id: "speak",
    label: "朗读",
    labelKey: "selection.actions.speak",
    icon: { type: "lucide", name: "Volume2", color: "#F59E0B" },
    action: { type: "speak" },
  },
];

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
  toolbarConfig: DEFAULT_CONFIG,
  setToolbarConfig: (toolbarConfig) => set({ toolbarConfig }),
  selectionEnabled: true,
  setSelectionEnabled: (selectionEnabled) => set({ selectionEnabled }),
  initSync: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((tauriHandler as any).load) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tauriHandler as any).load();
    }
  },
}));

// A handle to the Tauri plugin.
// We will need this to start the store.
export const tauriHandler = createTauriStore('selection-store', useSelectionStore, {
  saveOnChange: true,

  // You can also debounce or throttle when saving.
  // This is optional. The default behavior is to save immediately.
  saveStrategy: 'debounce',
  saveInterval: 1000,

  syncStrategy: 'debounce',
  syncInterval: 1000,
});
