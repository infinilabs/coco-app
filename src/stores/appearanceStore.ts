import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type WindowMode = "default" | "compact";

export type IAppearanceStore = {
  opacity: number;
  setOpacity: (opacity?: number) => void;
  snapshotUpdate: boolean;
  setSnapshotUpdate: (snapshotUpdate: boolean) => void;
  windowMode: WindowMode;
  setWindowMode: (windowMode: WindowMode) => void;
};

export const useAppearanceStore = create<IAppearanceStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        opacity: 30,
        setOpacity: (opacity) => {
          return set({ opacity: opacity });
        },
        snapshotUpdate: false,
        setSnapshotUpdate: (snapshotUpdate) => {
          return set({ snapshotUpdate });
        },
        windowMode: "default",
        setWindowMode(windowMode) {
          return set({ windowMode });
        },
      }),
      {
        name: "startup-store",
        partialize: (state) => ({
          opacity: state.opacity,
          snapshotUpdate: state.snapshotUpdate,
          windowMode: state.windowMode,
        }),
      }
    )
  )
);
