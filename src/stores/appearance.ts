import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type IAppearanceStore = {
  opacity: number;
  setOpacity: (opacity: number) => void;
};

export const useAppearanceStore = create<IAppearanceStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        opacity: 30,
        setOpacity: (opacity) => {
          return set({ opacity });
        },
      }),
      {
        name: "startup-store",
        partialize: (state) => ({
          opacity: state.opacity,
        }),
      }
    )
  )
);
