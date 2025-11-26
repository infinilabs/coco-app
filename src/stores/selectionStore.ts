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
        },
        toolbarConfig: [],
        setToolbarConfig(toolbarConfig) {
          set({ toolbarConfig });
          platformAdapter.emitEvent("change-selection-store", {
              iconsOnly: useSelectionStore.getState().iconsOnly,
              toolbarConfig,
            });
        },
        iconsOnly: false,
        setIconsOnly(iconsOnly) {
          set({ iconsOnly });
          platformAdapter.emitEvent("change-selection-store", {
              iconsOnly,
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
