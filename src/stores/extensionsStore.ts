import { ExtensionId } from "@/components/Settings/Extensions";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type IExtensionsStore = {
  quickAiAccessServer?: any;
  setQuickAiAccessServer: (quickAiAccessServer?: any) => void;
  quickAiAccessAssistant?: any;
  setQuickAiAccessAssistant: (quickAiAccessAssistant?: any) => void;
  aiOverviewServer?: any;
  setAiOverviewServer: (aiOverviewServer?: any) => void;
  aiOverviewAssistant?: any;
  setAiOverviewAssistant: (aiOverviewAssistant?: any) => void;
  disabledExtensions: ExtensionId[];
  setDisabledExtensions: (disabledExtensions?: string[]) => void;
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
        setAiOverviewServer(aiOverviewServer) {
          return set({ aiOverviewServer });
        },
        setAiOverviewAssistant(aiOverviewAssistant) {
          return set({ aiOverviewAssistant });
        },
        disabledExtensions: [],
        setDisabledExtensions(disabledExtensions) {
          return set({ disabledExtensions });
        },
      }),
      {
        name: "extensions-store",
        partialize: (state) => ({
          quickAiAccessServer: state.quickAiAccessServer,
          quickAiAccessAssistant: state.quickAiAccessAssistant,
          aiOverviewServer: state.aiOverviewServer,
          aiOverviewAssistant: state.aiOverviewAssistant,
        }),
      }
    )
  )
);
