import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AppEndpoint } from "@/utils/tauri"

export type IAppStore = {
  showTooltip: boolean;
  setShowTooltip: (showTooltip: boolean) => void;
  app_uid: string;
  setAppUid: (app_uid: string) => void,
  endpoint: AppEndpoint,
  endpoint_http: string,
  endpoint_websocket: string,
  setEndpoint: (endpoint: AppEndpoint) => void,
};

export const useAppStore = create<IAppStore>()(
  persist(
    (set) => ({
      showTooltip: true,
      setShowTooltip: (showTooltip: boolean) => set({ showTooltip }),
      app_uid: "",
      setAppUid: (app_uid: string) => set({ app_uid }),
      endpoint: "coco.infini.cloud",
      endpoint_http: "https://coco.infini.cloud",
      endpoint_websocket: "wss://coco.infini.cloud/ws",
      setEndpoint: (endpoint: AppEndpoint) => {
        set({
          endpoint,
          endpoint_http: endpoint?.includes('localhost:2900') ? 'http://localhost:2900' : "https://coco.infini.cloud",
          endpoint_websocket: endpoint?.includes('localhost:2900') ? 'ws://localhost:2900/ws' : "wss://coco.infini.cloud/ws",
        })
      },
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
