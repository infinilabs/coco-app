import { create } from "zustand";
import {
  persist,
  // createJSONStorage
} from "zustand/middleware";
import { Metadata } from "tauri-plugin-fs-pro-api";

export interface UploadAttachments extends Metadata {
  id: string;
  path: string;
  uploading: boolean;
  uploaded?: boolean;
  attachmentId?: string;
  uploadFailed?: boolean;
  failedMessage?: string;
}

interface SynthesizeItem {
  id: string;
  content: string;
}

export type IChatStore = {
  curChatEnd: boolean;
  setCurChatEnd: (value: boolean) => void;
  stopChat: boolean;
  setStopChat: (value: boolean) => void;
  connected: boolean;
  setConnected: (value: boolean) => void;
  messages: string;
  setMessages: (value: string | ((prev: string) => string)) => void;
  uploadAttachments: UploadAttachments[];
  setUploadAttachments: (value: UploadAttachments[]) => void;
  synthesizeItem?: SynthesizeItem;
  setSynthesizeItem: (synthesizeItem?: SynthesizeItem) => void;
  hasActiveChat?: boolean;
  setHasActiveChat: (hasActiveChat?: boolean) => void;
};

export const useChatStore = create<IChatStore>()(
  persist(
    (set) => ({
      curChatEnd: true,
      setCurChatEnd: (value: boolean) => set(() => ({ curChatEnd: value })),
      stopChat: false,
      setStopChat: (value: boolean) => set(() => ({ stopChat: value })),
      connected: false,
      setConnected: (value: boolean) => set(() => ({ connected: value })),
      messages: "",
      setMessages: (value: string | ((prev: string) => string)) =>
        set((state) => ({
          messages: typeof value === "function" ? value(state.messages) : value,
        })),
      uploadAttachments: [],
      setUploadAttachments: (uploadAttachments: UploadAttachments[]) => {
        return set(() => ({ uploadAttachments }));
      },
      setSynthesizeItem: (synthesizeItem?: SynthesizeItem) => {
        return set(() => ({ synthesizeItem }));
      },
      setHasActiveChat(hasActiveChat) {
        return set(() => ({ hasActiveChat }));
      },
    }),
    {
      name: "chat-state",
      // storage: createJSONStorage(() => sessionStorage),
      partialize: (_state) => ({}),
    }
  )
);
