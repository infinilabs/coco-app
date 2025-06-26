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
  aiOverviewCharLen: number;
  setAiOverviewCharLen: (aiOverviewCharLen: number) => void;
  aiOverviewDelay: number;
  setAiOverviewDelay: (aiOverviewDelay: number) => void;
  aiOverviewMinQuantity: number;
  setAiOverviewMinQuantity: (aiOverviewMinQuantity: number) => void;
  selectedId?: string;
  setSelectedId: (selectedId?: string) => void;
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
        aiOverviewCharLen: 10,
        setAiOverviewCharLen(aiOverviewCharLen) {
          return set({ aiOverviewCharLen });
        },
        aiOverviewDelay: 2,
        setAiOverviewDelay(aiOverviewDelay) {
          return set({ aiOverviewDelay });
        },
        aiOverviewMinQuantity: 5,
        setAiOverviewMinQuantity(aiOverviewMinQuantity) {
          return set({ aiOverviewMinQuantity });
        },
        setSelectedId(selectedId) {
          return set({ selectedId });
        },
      }),
      {
        name: "extensions-store",
        partialize: (state) => ({
          quickAiAccessServer: state.quickAiAccessServer,
          quickAiAccessAssistant: state.quickAiAccessAssistant,
          aiOverviewServer: state.aiOverviewServer,
          aiOverviewAssistant: state.aiOverviewAssistant,
          aiOverviewCharLen: state.aiOverviewCharLen,
          aiOverviewDelay: state.aiOverviewDelay,
          aiOverviewMinQuantity: state.aiOverviewMinQuantity,
        }),
      }
    )
  )
);
