import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type IAppearanceStore = {
  opacity: number;
  setOpacity: (opacity?: number) => void;
  snapshotUpdate: boolean;
  setSnapshotUpdate: (snapshotUpdate: boolean) => void;
};

export const useAppearanceStore = create<IAppearanceStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        opacity: 30,
        setOpacity: (opacity) => {
          return set({ opacity: opacity || 30 });
        },
        snapshotUpdate: false,
        setSnapshotUpdate: (snapshotUpdate) => {
          return set({ snapshotUpdate });
        },
      }),
      {
        name: "startup-store",
        partialize: (state) => ({
          opacity: state.opacity,
          snapshotUpdate: state.snapshotUpdate,
        }),
      }
    )
  )
);
