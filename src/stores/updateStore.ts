import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IUpdateStore = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  skipVersion?: string;
  setSkipVersion: (skipVersion?: string) => void;
  isOptional: boolean;
  setIsOptional: (isOptional: boolean) => void;
};

export const useUpdateStore = create<IUpdateStore>()(
  persist(
    (set) => ({
      visible: true,
      setVisible: (visible: boolean) => {
        return set({ visible });
      },
      setSkipVersion: (skipVersion?: string) => {
        return set({ skipVersion });
      },
      isOptional: false,
      setIsOptional: (isOptional: boolean) => {
        return set({ isOptional });
      },
    }),
    {
      name: "update-store",
      partialize: (state) => ({
        visible: state.visible,
        skipVersion: state.skipVersion,
        isOptional: state.isOptional,
      }),
    }
  )
);
