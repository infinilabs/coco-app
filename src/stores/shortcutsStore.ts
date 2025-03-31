import { isMac } from "@/utils/platform";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModifierKey = "meta" | "ctrl" | "alt";

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
  addImage: string;
  setAddImage: (addImage: string) => void;
  selectLlmModel: string;
  setSelectLlmModel: (selectLlmModel: string) => void;
  addFile: string;
  setAddFile: (addFile: string) => void;
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
);
