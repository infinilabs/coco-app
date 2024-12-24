import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IAppStore = {
  showTooltip: boolean;
  setShowTooltip: (showTooltip: boolean) => void;
};

export const useAppStore = create<IAppStore>()(
  persist(
    (set) => ({
      showTooltip: true,
      setShowTooltip: (showTooltip: boolean) => set({ showTooltip }),
    }),
    {
      name: "app-store",
      partialize: (state) => ({ showTooltip: state.showTooltip }),
    }
  )
);
