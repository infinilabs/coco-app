import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen, emit } from '@tauri-apps/api/event';

const AUTH_CHANGE_EVENT = 'auth-changed';
const USERINFO_CHANGE_EVENT = 'userInfo-changed';

export type Plan = {
  upgraded: boolean;
  last_checked: number;
};

export type AuthStore = {
  token: string;
  user_id?: string | null;
  expires?: number;
  plan?: Plan | null;
};

export type IAuthStore = {
  auth: AuthStore | undefined;
  userInfo: any;
  setAuth: (auth: AuthStore | undefined) => void;
  resetAuth: () => void;
  initializeListeners: () => void;
};

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      auth: undefined,
      userInfo: {},
      setAuth: async (auth) => {
        set({ auth })
        await emit(AUTH_CHANGE_EVENT, {
          auth
        });
      },
      resetAuth: async () => {
        set({ auth: undefined })

        await emit(AUTH_CHANGE_EVENT, {
          auth: undefined
        });
      },
      setUserInfo: async (userInfo: any) => {
        set({ userInfo })

        await emit(USERINFO_CHANGE_EVENT, {
          userInfo
        });
      },
      initializeListeners: () => {
        listen(AUTH_CHANGE_EVENT, (event: any) => {
          const { auth } = event.payload;
          set({ auth });
        });

        listen(USERINFO_CHANGE_EVENT, (event: any) => {
          const { userInfo } = event.payload;
          set({ userInfo });
        });
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ 
        auth: state.auth,
        userInfo: state.userInfo
      }),
    }
  )
);
