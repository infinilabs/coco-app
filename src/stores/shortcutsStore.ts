import { isMac } from "@/utils/platform";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type ModifierKey = "Command" | "Control" | "Option";

export type IShortcutsStore = {
  modifierKey: ModifierKey;
  setModifierKey: (modifierKey: ModifierKey) => void;
  modeSwitch: string;
  setModeSwitch: (modeSwitch: string) => void;
  returnToInput: string;
  setReturnToInput: (returnToInput: string) => void;
  voiceInput: string;
  setVoiceInput: (voiceInput: string) => void;
  addImage: string;
  setAddImage: (addImage: string) => void;
  selectLlmModel: string;
  setSelectLlmModel: (selectLlmModel: string) => void;
  addFile: string;
  setAddFile: (addFile: string) => void;
};

export const useShortcutsStore = create<IShortcutsStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        modifierKey: isMac ? "Command" : "Control",
        setModifierKey: (modifierKey: ModifierKey) => set({ modifierKey }),
        modeSwitch: "S",
        setModeSwitch: (modeSwitch: string) => set({ modeSwitch }),
        returnToInput: "I",
        setReturnToInput: (returnToInput: string) => set({ returnToInput }),
        voiceInput: "N",
        setVoiceInput: (voiceInput: string) => set({ voiceInput }),
        addImage: "G",
        setAddImage: (addImage: string) => set({ addImage }),
        selectLlmModel: "O",
        setSelectLlmModel: (selectLlmModel: string) => set({ selectLlmModel }),
        addFile: "U",
        setAddFile: (addFile: string) => set({ addFile }),
      }),
      {
        name: "shortcuts-store",
        partialize: (state) => ({
          modifierKey: state.modifierKey,
          modeSwitch: state.modeSwitch,
          returnToInput: state.returnToInput,
          voiceInput: state.voiceInput,
          addImage: state.addImage,
          selectLlmModel: state.selectLlmModel,
          addFile: state.addFile,
        }),
      }
    )
  )
);
