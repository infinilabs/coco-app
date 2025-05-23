import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type IExtensionsStore = {
  quickAiAccessServer?: any;
  setQuickAiAccessServer: (quickAiAccessServer?: any) => void;
  quickAiAccessAssistant?: any;
  setQuickAiAccessAssistant: (quickAiAccessAssistant?: any) => void;
};

export const useExtensionsStore = create<IExtensionsStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        setQuickAiAccessServer(quickAiAccessServer) {
          return set({ quickAiAccessServer });
        },
        setQuickAiAccessAssistant(quickAiAccessAssistant) {
          return set({ quickAiAccessAssistant });
        },
      }),
      {
        name: "extensions-store",
        partialize: (state) => ({
          quickAiAccessServer: state.quickAiAccessServer,
          quickAiAccessAssistant: state.quickAiAccessAssistant,
        }),
      }
    )
  )
);
