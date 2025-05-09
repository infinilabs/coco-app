import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type IExtensionStore = {
  disabledExtensions: string[];
  setDisabledExtensions: (disabledExtensions: string[]) => void;
};

export const useExtensionStore = create<IExtensionStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        disabledExtensions: [],
        setDisabledExtensions: (disabledExtensions) => {
          return set({ disabledExtensions });
        },
      }),
      {
        name: "extension-store",
        partialize: () => ({}),
      }
    )
  )
);
