import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type ISelectionStore = {
  selectionEnabled: boolean;
  setSelectionEnabled: (selectionEnabled: boolean) => void;
};

export const useSelectionStore = create<ISelectionStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        selectionEnabled: true,
        setSelectionEnabled(selectionEnabled) {
          return set({ selectionEnabled });
        },
      }),
      {
        name: "selection-store",
        partialize: (state) => ({
          selectionEnabled: state.selectionEnabled,
        }),
      }
    )
  )
);