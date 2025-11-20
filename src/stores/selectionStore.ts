import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type ISelectionStore = {
  // whether selection is enabled
  selectionEnabled: boolean;
  setSelectionEnabled: (selectionEnabled: boolean) => void;
  // toolbar buttons configuration for selection window
  toolbarConfig: any[];
  setToolbarConfig: (toolbarConfig: any[]) => void;
};

export const useSelectionStore = create<ISelectionStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        selectionEnabled: false,
        setSelectionEnabled(selectionEnabled) {
          set({ selectionEnabled });
        },
        toolbarConfig: [],
        setToolbarConfig(toolbarConfig) {
          return set({ toolbarConfig });
        },
      }),
      {
        name: "selection-store",
        partialize: (state) => ({
          toolbarConfig: state.toolbarConfig,
        }),
      }
    )
  )
);