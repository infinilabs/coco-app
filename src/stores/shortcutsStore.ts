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
  mcpSearch: string;
  setMcpSearch: (internetSearch: string) => void;
  mcpSearchScope: string;
  setMcpSearchScope: (internetSearchScope: string) => void;
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

export const INITIAL_MODE_SWITCH = "T";
export const INITIAL_RETURN_TO_INPUT = "I";
export const INITIAL_VOICE_INPUT = "K";
export const INITIAL_ADD_FILE = "A";
export const INITIAL_DEEP_THINKING = "D";
export const INITIAL_INTERNET_SEARCH = "G";
export const INITIAL_INTERNET_SEARCH_SCOPE = "J";
export const INITIAL_MCP_SEARCH = "B";
export const INITIAL_MCP_SEARCH_SCOPE = "L";
export const INITIAL_HISTORICAL_RECORDS = "Y";
export const INITIAL_AI_ASSISTANT = "U";
export const INITIAL_NEW_SESSION = "N";
export const INITIAL_FIXED_WINDOW = "P";
export const INITIAL_SERVICE_LIST = "S";
export const INITIAL_EXTERNAL = "E";

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
      modeSwitch: INITIAL_MODE_SWITCH,
      setModeSwitch: (modeSwitch) => set({ modeSwitch }),
      returnToInput: INITIAL_RETURN_TO_INPUT,
      setReturnToInput: (returnToInput) => set({ returnToInput }),
      voiceInput: INITIAL_VOICE_INPUT,
      setVoiceInput: (voiceInput) => set({ voiceInput }),
      addFile: INITIAL_ADD_FILE,
      setAddFile: (addFile) => set({ addFile }),
      deepThinking: INITIAL_DEEP_THINKING,
      setDeepThinking: (deepThinking) => set({ deepThinking }),
      internetSearch: INITIAL_INTERNET_SEARCH,
      setInternetSearch: (internetSearch) => set({ internetSearch }),
      internetSearchScope: INITIAL_INTERNET_SEARCH_SCOPE,
      setInternetSearchScope: (internetSearchScope) => {
        return set({ internetSearchScope });
      },
      mcpSearch: INITIAL_MCP_SEARCH,
      setMcpSearch: (mcpSearch) => set({ mcpSearch }),
      mcpSearchScope: INITIAL_MCP_SEARCH_SCOPE,
      setMcpSearchScope: (mcpSearchScope) => {
        return set({ mcpSearchScope });
      },
      historicalRecords: INITIAL_HISTORICAL_RECORDS,
      setHistoricalRecords: (historicalRecords) => {
        return set({ historicalRecords });
      },
      aiAssistant: INITIAL_AI_ASSISTANT,
      setAiAssistant: (aiAssistant) => set({ aiAssistant }),
      newSession: INITIAL_NEW_SESSION,
      setNewSession: (newSession) => set({ newSession }),
      fixedWindow: INITIAL_FIXED_WINDOW,
      setFixedWindow: (fixedWindow) => set({ fixedWindow }),
      serviceList: INITIAL_SERVICE_LIST,
      setServiceList: (serviceList) => set({ serviceList }),
      external: INITIAL_EXTERNAL,
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
        internetSearchScope: state.internetSearchScope,
        mcpSearch: state.mcpSearch,
        mcpSearchScope: state.mcpSearchScope,
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
