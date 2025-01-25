import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen, emit } from '@tauri-apps/api/event';

import { AppEndpoint } from "@/utils/tauri"

const ENDPOINT_CHANGE_EVENT = 'endpoint-changed';

export type IAppStore = {
  showTooltip: boolean;
  setShowTooltip: (showTooltip: boolean) => void;
  app_uid: string;
  setAppUid: (app_uid: string) => void,
  endpoint: AppEndpoint,
  endpoint_http: string,
  endpoint_websocket: string,
  setEndpoint: (endpoint: AppEndpoint) => void,
  initializeListeners: () => void;
};

export const useAppStore = create<IAppStore>()(
  persist(
    (set) => ({
      showTooltip: true,
      setShowTooltip: (showTooltip: boolean) => set({ showTooltip }),
      app_uid: "",
      setAppUid: (app_uid: string) => set({ app_uid }),
      endpoint: "https://coco.infini.cloud",
      endpoint_http: "https://coco.infini.cloud",
      endpoint_websocket: "wss://coco.infini.cloud/ws",
      setEndpoint: async (endpoint: AppEndpoint) => {
        const endpoint_http = endpoint;

        const withoutProtocol = endpoint.split("//")[1];

        const endpoint_websocket = endpoint?.includes('https')
          ? `wss://${withoutProtocol}/ws`
          : `ws://${withoutProtocol}/ws`;

        set({
          endpoint,
          endpoint_http,
          endpoint_websocket,
        });

        await emit(ENDPOINT_CHANGE_EVENT, {
          endpoint,
          endpoint_http,
          endpoint_websocket
        });
      },
      initializeListeners: () => {
        listen(ENDPOINT_CHANGE_EVENT, (event: any) => {
          const { endpoint, endpoint_http, endpoint_websocket } = event.payload;
          set({ endpoint, endpoint_http, endpoint_websocket });
        });
      },
    }),
    {
      name: "app-store",
      partialize: (state) => ({
        showTooltip: state.showTooltip,
        app_uid: state.app_uid,
        endpoint: state.endpoint,
        endpoint_http: state.endpoint_http,
        endpoint_websocket: state.endpoint_websocket,
      }),
    }
  )
);
