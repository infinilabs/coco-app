import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import platformAdapter from "@/utils/platformAdapter";

export type ISelectionStore = {
  // whether selection is enabled
  selectionEnabled: boolean;
  setSelectionEnabled: (selectionEnabled: boolean) => void;
  // toolbar buttons configuration for selection window
  toolbarConfig: any[];
  setToolbarConfig: (toolbarConfig: any[]) => void;
  // whether to show icons only (hide labels) in selection window
  iconsOnly: boolean;
  setIconsOnly: (iconsOnly: boolean) => void;
};

export const useSelectionStore = create<ISelectionStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        selectionEnabled: false,
        setSelectionEnabled(selectionEnabled) {
          set({ selectionEnabled });
          platformAdapter.emitEvent("change-selection-store", {
              iconsOnly: useSelectionStore.getState().iconsOnly,
              selectionEnabled: selectionEnabled,
              toolbarConfig: useSelectionStore.getState().toolbarConfig,
            });
        },
        toolbarConfig: [],
        setToolbarConfig(toolbarConfig) {
          set({ toolbarConfig });
          platformAdapter.emitEvent("change-selection-store", {
              iconsOnly: useSelectionStore.getState().iconsOnly,
              selectionEnabled: useSelectionStore.getState().selectionEnabled,
              toolbarConfig,
            });
        },
        iconsOnly: false,
        setIconsOnly(iconsOnly) {
          set({ iconsOnly });
          platformAdapter.emitEvent("change-selection-store", {
              iconsOnly,
              selectionEnabled: useSelectionStore.getState().selectionEnabled,
              toolbarConfig: useSelectionStore.getState().toolbarConfig,
            });
        }
      }),
      {
        name: "selection-store",
        partialize: (state) => ({
          toolbarConfig: state.toolbarConfig,
          iconsOnly: state.iconsOnly,
        }),
      }
    )
  )
);
