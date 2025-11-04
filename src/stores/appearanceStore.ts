import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type WindowMode = "default" | "compact";

export type IAppearanceStore = {
  normalOpacity: number;
  setNormalOpacity: (normalOpacity: number) => void;
  blurOpacity: number;
  setBlurOpacity: (blurOpacity: number) => void;
  snapshotUpdate: boolean;
  setSnapshotUpdate: (snapshotUpdate: boolean) => void;
  windowMode: WindowMode;
  setWindowMode: (windowMode: WindowMode) => void;
};

export const useAppearanceStore = create<IAppearanceStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        normalOpacity: 100,
        setNormalOpacity(normalOpacity) {
          return set({ normalOpacity });
        },
        blurOpacity: 30,
        setBlurOpacity(blurOpacity) {
          return set({ blurOpacity });
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
          normalOpacity: state.normalOpacity,
          blurOpacity: state.blurOpacity,
          snapshotUpdate: state.snapshotUpdate,
          windowMode: state.windowMode,
        }),
      }
    )
  )
);
