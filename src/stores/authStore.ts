import { create } from "zustand";
import { persist } from "zustand/middleware";
import { produce } from "immer";

import platformAdapter from "@/utils/platformAdapter";

const AUTH_CHANGE_EVENT = "auth-changed";
const USERINFO_CHANGE_EVENT = "userInfo-changed";

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
  initializeListeners: () => Promise<() => void>;
};

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      auth: undefined,
      userInfo: {},
      setAuth: async (auth, key) => {
        set(
          produce((draft) => {
            draft.auth[key] = auth;
          })
        );

        await platformAdapter.emitEvent(AUTH_CHANGE_EVENT, {
          auth: {
            [key]: auth,
          },
        });
      },
      resetAuth: async (key: string) => {
        set(
          produce((draft) => {
            draft.auth[key] = undefined;
          })
        );

        await platformAdapter.emitEvent(AUTH_CHANGE_EVENT, {
          auth: {
            [key]: undefined,
          },
        });
      },
      setUserInfo: async (userInfo: any, key: string) => {
        set(
          produce((draft) => {
            draft.userInfo[key] = userInfo;
          })
        );

        await platformAdapter.emitEvent(USERINFO_CHANGE_EVENT, {
          userInfo: {
            [key]: userInfo,
          },
        });
      },
      initializeListeners: async () => {
        await platformAdapter.listenEvent(AUTH_CHANGE_EVENT, (event: any) => {
          const { auth } = event.payload;
          set({ auth });
        });

        return platformAdapter.listenEvent(
          USERINFO_CHANGE_EVENT,
          (event: any) => {
            const { userInfo } = event.payload;
            set({ userInfo });
          }
        );
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        auth: state.auth,
        userInfo: state.userInfo,
      }),
    }
  )
);
