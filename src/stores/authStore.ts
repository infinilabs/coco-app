import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export type IAuthStore = {
  isCurrentLogin: boolean;
  setIsCurrentLogin: (isCurrentLogin: boolean) => void;
};

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      isCurrentLogin: true,
      setIsCurrentLogin: (isCurrentLogin: boolean) => {
        set({ isCurrentLogin });
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        isCurrentLogin: state.isCurrentLogin,
      }),
    }
  )
);
