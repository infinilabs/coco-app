import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IUpdateStore = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  skipVersion?: string;
  setSkipVersion: (skipVersion?: string) => void;
  isOptional: boolean;
  setIsOptional: (isOptional: boolean) => void;
  updateInfo?: any;
  setUpdateInfo: (updateInfo?: any) => void;
};

export const useUpdateStore = create<IUpdateStore>()(
  persist(
    (set) => ({
      visible: false,
      setVisible: (visible: boolean) => {
        return set({ visible });
      },
      setSkipVersion: (skipVersion?: string) => {
        return set({ skipVersion });
      },
      isOptional: true,
      setIsOptional: (isOptional: boolean) => {
        return set({ isOptional });
      },
      setUpdateInfo: (updateInfo?: any) => {
        return set({ updateInfo });
      },
    }),
    {
      name: "update-store",
      partialize: (state) => ({
        skipVersion: state.skipVersion,
      }),
    }
  )
);
