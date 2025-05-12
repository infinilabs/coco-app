import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type IExtensionStore = {};

export const useExtensionStore = create<IExtensionStore>()(
  subscribeWithSelector(
    persist(() => ({}), {
      name: "extension-store",
      partialize: () => ({}),
    })
  )
);
