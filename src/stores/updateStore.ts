import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IUpdateStore = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  skipVersion?: string;
  setSkipVersion: (skipVersion?: string) => void;
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
    }),
    {
      name: "update-store",
      partialize: (state) => ({
        visible: state.visible,
        skipVersion: state.skipVersion,
      }),
    }
  )
);
