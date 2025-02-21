import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen, emit } from '@tauri-apps/api/event';

import { AppEndpoint } from "@/utils/tauri"

const ENDPOINT_CHANGE_EVENT = 'endpoint-changed';

export type IAppStore = {
  showTooltip: boolean;
  setShowTooltip: (showTooltip: boolean) => void;

  error: string;
  setError: (message: any) => void,

  ssoRequestID: string;
  setSSORequestID: (ssoRequestID: string) => void,

  // ssoServerID: string;
  // setSSOServerID: (ssoServerID: string) => void,

  endpoint: AppEndpoint,
  endpoint_http: string,
  endpoint_websocket: string,
  setEndpoint: (endpoint: AppEndpoint) => void,
  language: string;
  setLanguage: (language: string) => void;
  tabIndex: number;
  setTabIndex: (tabName: string) => void;
  isPinned: boolean,
  setIsPinned: (isPinned: boolean) => void,
  initializeListeners: () => void;
};

export const useAppStore = create<IAppStore>()(
  persist(
    (set) => ({
      showTooltip: true,
      setShowTooltip: (showTooltip: boolean) => set({ showTooltip }),
      error: "",
      setError: (message: any) => set({ error: message as string }),
      ssoRequestID: "",
      setSSORequestID: (ssoRequestID: string) => set({ ssoRequestID }),
      //  ssoServerID: "",
      // setSSOServerID: (ssoServerID: string) => set({ ssoServerID }),
      endpoint: "https://coco.infini.cloud/",
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
      language: "en",
      setLanguage: (language: string) => set({ language }),
      tabIndex: 0,
      setTabIndex: (tabName: string) => {
        const tabIndexMap: { [key: string]: number } = {
          'general': 0,
          'extensions': 1,
          'connect': 2,
          'advanced': 3,
          'about': 4
        };
        set({ tabIndex: tabIndexMap[tabName || "general"] || 0 })
      },
      isPinned: false,
      setIsPinned: (isPinned: boolean) => set({ isPinned }),
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
        ssoRequestID: state.ssoRequestID,
        // ssoServerID: state.ssoServerID,
        error: state.error,
        endpoint: state.endpoint,
        endpoint_http: state.endpoint_http,
        endpoint_websocket: state.endpoint_websocket,
        language: state.language,
      }),
    }
  )
);
