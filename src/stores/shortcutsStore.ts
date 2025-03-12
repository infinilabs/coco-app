import { isMac } from "@/utils/platform";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IShortcutsStore = {
  showCoco: string[];
  setShowCoco: (showCoco: string[]) => void;
  modeSwitch: string[];
  setModeSwitch: (modeSwitch: string[]) => void;
  returnToInput: string[];
  setReturnToInput: (returnToInput: string[]) => void;
  voiceInput: string[];
  setVoiceInput: (voiceInput: string[]) => void;
  addImage: string[];
  setAddImage: (addImage: string[]) => void;
  selectLlmModel: string[];
  setSelectLlmModel: (selectLlmModel: string[]) => void;
  addFile: string[];
  setAddFile: (addFile: string[]) => void;
};

export const useShortcutsStore = create<IShortcutsStore>()(
  persist(
    (set) => ({
      showCoco: [],
      setShowCoco: (showCoco: string[]) => set({ showCoco }),
      modeSwitch: isMac ? ["Command", "T"] : ["control", "T"],
      setModeSwitch: (modeSwitch: string[]) => set({ modeSwitch }),
      returnToInput: isMac ? ["Command", "I"] : ["control", "I"],
      setReturnToInput: (returnToInput: string[]) => set({ returnToInput }),
      voiceInput: isMac ? ["Command", "N"] : ["control", "N"],
      setVoiceInput: (voiceInput: string[]) => set({ voiceInput }),
      addImage: isMac ? ["Command", "G"] : ["control", "G"],
      setAddImage: (addImage: string[]) => set({ addImage }),
      selectLlmModel: isMac ? ["Command", "O"] : ["control", "O"],
      setSelectLlmModel: (selectLlmModel: string[]) => set({ selectLlmModel }),
      addFile: isMac ? ["Command", "U"] : ["control", "U"],
      setAddFile: (addFile: string[]) => set({ addFile }),
    }),
    {
      name: "shortcuts-store",
      partialize: (state) => ({
        showCoco: state.showCoco,
        modeSwitch: state.modeSwitch,
        returnToInput: state.returnToInput,
        voiceInput: state.voiceInput,
        addImage: state.addImage,
        selectLlmModel: state.selectLlmModel,
        addFile: state.addFile,
      }),
    }
  )
);
