import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AppEndpoint } from "@/types/index";
import platformAdapter from "@/utils/platformAdapter";

const ENDPOINT_CHANGE_EVENT = "endpoint-changed";
const TOOLTIP_CHANGE_EVENT = "showTooltip-changed";

interface ErrorMessage {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  timestamp: number;
}

export type IAppStore = {
  showTooltip: boolean;
  setShowTooltip: (showTooltip: boolean) => void;

  errors: ErrorMessage[];
  addError: (message: string, type?: "error" | "warning" | "info") => void;
  removeError: (id: string) => void;
  clearErrors: () => void;

  ssoRequestID: string;
  setSSORequestID: (ssoRequestID: string) => void;

  endpoint: AppEndpoint;
  endpoint_http: string;
  endpoint_websocket: string;
  setEndpoint: (endpoint: AppEndpoint) => void;
  language: string;
  setLanguage: (language: string) => void;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
  initializeListeners: () => Promise<() => void>;

  showCocoShortcuts: string[];
  setShowCocoShortcuts: (showCocoShortcuts: string[]) => void;

  isTauri: boolean;
  setIsTauri: (isTauri: boolean) => void;

  visible: boolean;
  withVisibility: <T>(fn: () => Promise<T>) => Promise<T>;

  blurred: boolean;
  setBlurred: (blurred: boolean) => void;
};

export const useAppStore = create<IAppStore>()(
  persist(
    (set) => ({
      showTooltip: true,
      setShowTooltip: async (showTooltip: boolean) => {
        set({ showTooltip })

        await platformAdapter.emitEvent(TOOLTIP_CHANGE_EVENT, {
          showTooltip,
        });
      },
      errors: [],
      addError: (
        message: string,
        type: "error" | "warning" | "info" = "error"
      ) =>
        set((state) => {
          const newError = {
            id: Date.now().toString(),
            type,
            message,
            timestamp: Date.now(),
          };
          const updatedErrors = [newError, ...state.errors].slice(0, 5);
          return { errors: updatedErrors };
        }),
      removeError: (id: string) =>
        set((state) => ({
          errors: state.errors.filter((error) => error.id !== id),
        })),
      clearErrors: () => set({ errors: [] }),

      ssoRequestID: "",
      setSSORequestID: (ssoRequestID: string) => set({ ssoRequestID }),

      endpoint: "https://coco.infini.cloud/",
      endpoint_http: "https://coco.infini.cloud",
      endpoint_websocket: "wss://coco.infini.cloud/ws",
      setEndpoint: async (endpoint: AppEndpoint) => {
        const endpoint_http = endpoint;

        const withoutProtocol = endpoint.split("//")[1];

        const endpoint_websocket = endpoint?.includes("https")
          ? `wss://${withoutProtocol}/ws`
          : `ws://${withoutProtocol}/ws`;

        set({
          endpoint,
          endpoint_http,
          endpoint_websocket,
        });

        await platformAdapter.emitEvent(ENDPOINT_CHANGE_EVENT, {
          endpoint,
          endpoint_http,
          endpoint_websocket,
        });
      },
      language: "en",
      setLanguage: (language: string) => set({ language }),
      isPinned: false,
      setIsPinned: (isPinned: boolean) => set({ isPinned }),
      initializeListeners: () => {
        platformAdapter.listenEvent(
          TOOLTIP_CHANGE_EVENT,
          (event: any) => {
            const { showTooltip } =
              event.payload;
            set({ showTooltip });
          }
        );

        return platformAdapter.listenEvent(
          ENDPOINT_CHANGE_EVENT,
          (event: any) => {
            const { endpoint, endpoint_http, endpoint_websocket } =
              event.payload;
            set({ endpoint, endpoint_http, endpoint_websocket });
          }
        );
      },
      showCocoShortcuts: [],
      setShowCocoShortcuts: (showCocoShortcuts: string[]) => {
        console.log("set showCocoShortcuts", showCocoShortcuts);

        return set({ showCocoShortcuts });
      },
      isTauri: true,
      setIsTauri: (isTauri: boolean) => set({ isTauri }),
      visible: false,
      withVisibility: async <T>(fn: () => Promise<T>) => {
        set({ visible: true });

        const result = await fn();

        set({ visible: false });

        return result;
      },

      blurred: false,
      setBlurred: (blurred: boolean) => set({ blurred }),
    }),
    {
      name: "app-store",
      partialize: (state) => ({
        isTauri: state.isTauri,
        showTooltip: state.showTooltip,
        ssoRequestID: state.ssoRequestID,
        endpoint: state.endpoint,
        endpoint_http: state.endpoint_http,
        endpoint_websocket: state.endpoint_websocket,
        language: state.language,
      }),
    }
  )
);
