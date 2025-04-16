import { create } from "zustand";
import { persist } from "zustand/middleware";

import { isMac } from "@/utils/platform";
import { ModifierKey } from "@/types/index";

export type IShortcutsStore = {
  modifierKey: ModifierKey;
  setModifierKey: (modifierKey: ModifierKey) => void;
  modifierKeyPressed: boolean;
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
  newSession: string;
  setNewSession: (newSession: string) => void;
  fixedWindow: string;
  setFixedWindow: (fixedWindow: string) => void;
  serviceList: string;
  setServiceList: (serviceList: string) => void;
  external: string;
  setExternal: (external: string) => void;
};

export const useShortcutsStore = create<IShortcutsStore>()(
  persist(
    (set) => ({
      modifierKey: isMac ? "meta" : "ctrl",
      setModifierKey: (modifierKey: ModifierKey) => set({ modifierKey }),
      modifierKeyPressed: false,
      setModifierKeyPressed: (modifierKeyPressed: boolean) =>
        set({ modifierKeyPressed }),
      modeSwitch: "T",
      setModeSwitch: (modeSwitch: string) => set({ modeSwitch }),
      returnToInput: "I",
      setReturnToInput: (returnToInput: string) => set({ returnToInput }),
      voiceInput: "K",
      setVoiceInput: (voiceInput: string) => set({ voiceInput }),
      addFile: "A",
      setAddFile: (addFile: string) => set({ addFile }),
      deepThinking: "D",
      setDeepThinking: (deepThinking: string) => set({ deepThinking }),
      internetSearch: "G",
      setInternetSearch: (internetSearch: string) => set({ internetSearch }),
      internetSearchScope: "J",
      setInternetSearchScope: (internetSearchScope: string) => {
        return set({ internetSearchScope });
      },
      historicalRecords: "Y",
      setHistoricalRecords: (historicalRecords: string) => {
        return set({ historicalRecords });
      },
      newSession: "N",
      setNewSession: (newSession: string) => set({ newSession }),
      fixedWindow: "F",
      setFixedWindow: (fixedWindow: string) => set({ fixedWindow }),
      serviceList: "S",
      setServiceList: (serviceList: string) => set({ serviceList }),
      external: "E",
      setExternal: (external: string) => set({ external }),
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
        newSession: state.newSession,
        fixedWindow: state.fixedWindow,
        serviceList: state.serviceList,
        external: state.external,
      }),
    }
  )
);
