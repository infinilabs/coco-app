import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Plan = {
  upgraded: boolean;
  last_checked: number;
};

export type AuthStore = {
  token: string;
  user_id: string | null;
  expires: number;
  plan: Plan | null;
};

export type IAuthStore = {
  auth: AuthStore | undefined;
  setAuth: (auth: AuthStore | undefined) => void;
  resetAuth: () => void;
};

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      auth: undefined,
      setAuth: (auth) => set({ auth }),
      resetAuth: () => set({ auth: undefined }),
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ auth: state.auth }),
    }
  )
);
