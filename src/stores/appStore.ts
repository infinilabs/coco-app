import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IAppStore = {
  showTooltip: boolean;
  setShowTooltip: (showTooltip: boolean) => void;
  app_uid: string;
  setAppUid: (app_uid: string) => void,
};

export const useAppStore = create<IAppStore>()(
  persist(
    (set) => ({
      showTooltip: true,
      setShowTooltip: (showTooltip: boolean) => set({ showTooltip }),
      app_uid: "",
      setAppUid: (app_uid: string) => set({ app_uid }),
    }),
    {
      name: "app-store",
      partialize: (state) => ({ 
        showTooltip: state.showTooltip,
        app_uid: state.app_uid
       }),
    }
  )
);
