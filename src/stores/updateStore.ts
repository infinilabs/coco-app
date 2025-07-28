import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IUpdateStore = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  skipVersions: string[];
  setSkipVersions: (skipVersions: string[]) => void;
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
      skipVersions: [],
      setSkipVersions: (skipVersions: string[]) => {
        return set({ skipVersions });
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
        skipVersion: state.skipVersions,
      }),
    }
  )
);
