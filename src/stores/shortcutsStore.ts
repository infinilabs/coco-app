import { create } from "zustand";
import { persist } from "zustand/middleware";

import { isMac } from "@/utils/platform";
import { ModifierKey } from "@/types/index";

export type IShortcutsStore = {
  modifierKey: ModifierKey;
  setModifierKey: (modifierKey: ModifierKey) => void;
  modifierKeyPressed: boolean;
  openPopover: boolean;
  setOpenPopover: (openPopover: boolean) => void;
  setModifierKeyPressed: (modifierKeyPressed: boolean) => void;
  modeSwitch: string;
  setModeSwitch: (modeSwitch: string) => void;
  returnToInput: string;
  setReturnToInput: (returnToInput: string) => void;
  voiceInput: string;
  setVoiceInput: (voiceInput: string) => void;
  addFile: string;
  setAddFile: (addFile: string) => void;
  deepThinking: string;
  setDeepThinking: (deepThinking: string) => void;
  internetSearch: string;
  setInternetSearch: (internetSearch: string) => void;
  internetSearchScope: string;
  setInternetSearchScope: (internetSearchScope: string) => void;
  historicalRecords: string;
  setHistoricalRecords: (historicalRecords: string) => void;
  aiAssistant: string;
  setAiAssistant: (aiAssistant: string) => void;
  newSession: string;
  setNewSession: (newSession: string) => void;
  fixedWindow: string;
  setFixedWindow: (fixedWindow: string) => void;
  serviceList: string;
  setServiceList: (serviceList: string) => void;
  external: string;
  setExternal: (external: string) => void;
  resetFixedWindow: boolean;
  setResetFixedWindow: (resetFixedWindow: boolean) => void;
};

export const useShortcutsStore = create<IShortcutsStore>()(
  persist(
    (set) => ({
      modifierKey: isMac ? "meta" : "ctrl",
      setModifierKey: (modifierKey) => set({ modifierKey }),
      modifierKeyPressed: false,
      openPopover: false,
      setOpenPopover: (openPopover) => {
        return set({ openPopover });
      },
      setModifierKeyPressed: (modifierKeyPressed: boolean) => {
        return set({ modifierKeyPressed });
      },
      modeSwitch: "T",
      setModeSwitch: (modeSwitch) => set({ modeSwitch }),
      returnToInput: "I",
      setReturnToInput: (returnToInput) => set({ returnToInput }),
      voiceInput: "K",
      setVoiceInput: (voiceInput) => set({ voiceInput }),
      addFile: "A",
      setAddFile: (addFile) => set({ addFile }),
      deepThinking: "D",
      setDeepThinking: (deepThinking) => set({ deepThinking }),
      internetSearch: "G",
      setInternetSearch: (internetSearch) => set({ internetSearch }),
      internetSearchScope: "J",
      setInternetSearchScope: (internetSearchScope) => {
        return set({ internetSearchScope });
      },
      historicalRecords: "Y",
      setHistoricalRecords: (historicalRecords) => {
        return set({ historicalRecords });
      },
      aiAssistant: "U",
      setAiAssistant: (aiAssistant) => set({ aiAssistant }),
      newSession: "N",
      setNewSession: (newSession) => set({ newSession }),
      fixedWindow: "P",
      setFixedWindow: (fixedWindow) => set({ fixedWindow }),
      serviceList: "S",
      setServiceList: (serviceList) => set({ serviceList }),
      external: "E",
      setExternal: (external) => set({ external }),
      resetFixedWindow: false,
      setResetFixedWindow: (resetFixedWindow) => {
        return set({ resetFixedWindow });
      },
    }),
    {
      name: "shortcuts-store",
      partialize: (state) => ({
        modifierKey: state.modifierKey,
        modeSwitch: state.modeSwitch,
        returnToInput: state.returnToInput,
        voiceInput: state.voiceInput,
        addFile: state.addFile,
        deepThinking: state.deepThinking,
        internetSearch: state.internetSearch,
        historicalRecords: state.historicalRecords,
        aiAssistant: state.aiAssistant,
        newSession: state.newSession,
        fixedWindow: state.fixedWindow,
        serviceList: state.serviceList,
        external: state.external,
        resetFixedWindow: state.resetFixedWindow,
      }),
    }
  )
);
