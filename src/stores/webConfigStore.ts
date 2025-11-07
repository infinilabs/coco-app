import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Integration {
  guest?: {
    enabled?: boolean;
    run_as?: string;
  };
}

interface LoginInfo {
  id: string;
  name: string;
  email: string;
}

export type IWebAccessControlStore = {
  integration?: Integration;
  setIntegration: (integration?: Integration) => void;
  loginInfo?: LoginInfo;
  setLoginInfo: (loginInfo?: LoginInfo) => void;
  onRefresh: () => Promise<void>;
  setOnRefresh: (onRefresh: () => Promise<void>) => void;
  disabled: boolean;
  setDisabled: (disabled: boolean) => void;
};

export const useWebConfigStore = create<IWebAccessControlStore>()(
  persist(
    (set) => ({
      setIntegration: (integration) => {
        return set({ integration });
      },
      setLoginInfo: (loginInfo) => {
        return set({ loginInfo });
      },
      onRefresh: async () => {},
      setOnRefresh: (onRefresh) => {
        return set({ onRefresh });
      },
      disabled: true,
      setDisabled: (disabled) => {
        return set({ disabled });
      },
    }),
    {
      name: "web-config-store",
      partialize: () => ({}),
    }
  )
);
