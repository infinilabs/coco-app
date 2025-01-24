import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen, emit } from '@tauri-apps/api/event';
import { produce } from 'immer'

const AUTH_CHANGE_EVENT = 'auth-changed';
const USERINFO_CHANGE_EVENT = 'userInfo-changed';

export type Plan = {
  upgraded: boolean;
  last_checked: number;
};

export type AuthProp = {
  token: string;
  user_id?: string | null;
  expires?: number;
  plan?: Plan | null;
};

type AuthMapProp = {
  [key: string]: AuthProp;
};

type userInfoMapProp = {
  [key: string]: any;
};

export type IAuthStore = {
  [x: string]: any;
  auth: AuthMapProp | undefined;
  userInfo: userInfoMapProp;
  setAuth: (auth: AuthProp | undefined, key: string) => void;
  resetAuth: (key: string) => void;
  initializeListeners: () => void;
};

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      auth: undefined,
      userInfo: {},
      setAuth: async (auth, key) => {
        set(
          produce((draft) => {
            draft.auth[key] = auth
          })
        );

        await emit(AUTH_CHANGE_EVENT, {
          auth: {
            [key]: auth
          }
        });
      },
      resetAuth: async (key: string) => {
        set(
          produce((draft) => {
            draft.auth[key] = undefined
          })
        );

        await emit(AUTH_CHANGE_EVENT, {
          auth: {
            [key]: undefined
          }
        });
      },
      setUserInfo: async (userInfo: any, key: string) => {
        set(
          produce((draft) => {
            draft.userInfo[key] = userInfo
          })
        );

        await emit(USERINFO_CHANGE_EVENT, {
          userInfo: {
            [key]: userInfo
          }
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
