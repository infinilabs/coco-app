import { createPersistentStore } from "./middleware/storageAdapter";

interface SelectionStore {
  iconsOnly: boolean;
  setIconsOnly: (iconsOnly: boolean) => void;
  toolbarConfig: string[];
  setToolbarConfig: (config: string[]) => void;
  selectionEnabled: boolean;
  setSelectionEnabled: (enabled: boolean) => void;
}

export const useSelectionStore = createPersistentStore<SelectionStore>(
  "selection-store",
  (set) => ({
    iconsOnly: false,
    setIconsOnly: (iconsOnly) => set({ iconsOnly }),
    toolbarConfig: [],
    setToolbarConfig: (toolbarConfig) => set({ toolbarConfig }),
    selectionEnabled: true,
    setSelectionEnabled: (selectionEnabled) => set({ selectionEnabled }),
  }),
  {
    partialize: (state) => ({
      iconsOnly: state.iconsOnly,
      toolbarConfig: state.toolbarConfig,
      // selectionEnabled is excluded from persistence
    } as SelectionStore),
  }
);
