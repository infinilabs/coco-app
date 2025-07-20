import { create } from "zustand";
import {
  persist,
  // createJSONStorage
} from "zustand/middleware";
import { Metadata } from "tauri-plugin-fs-pro-api";

export interface UploadFile extends Metadata {
  id: string;
  path: string;
  uploaded?: boolean;
  attachmentId?: string;
  uploadFailed?: boolean;
  failedMessage?: string;
}

interface SynthesizeItem {
  id: string;
  content: string;
}

interface ChatSessionState {
  curChatEnd: boolean;
}

export type IChatStore = {
  stopChat: boolean;
  setStopChat: (value: boolean) => void;
  connected: boolean;
  setConnected: (value: boolean) => void;
  messages: string;
  setMessages: (value: string | ((prev: string) => string)) => void;
  uploadFiles: UploadFile[];
  setUploadFiles: (value: UploadFile[]) => void;
  synthesizeItem?: SynthesizeItem;
  setSynthesizeItem: (synthesizeItem?: SynthesizeItem) => void;
  chatSessions: Record<string, ChatSessionState>;
  curSessionId: string;
  setCurSessionId: (sessionId: string) => void;
  setCurChatEnd: (value: boolean, sessionId: string) => void;
  clearChatSession: (sessionId: string) => void;
};

export const useChatStore = create<IChatStore>()(
  persist(
    (set) => ({
      stopChat: false,
      setStopChat: (value: boolean) => set(() => ({ stopChat: value })),
      connected: false,
      setConnected: (value: boolean) => set(() => ({ connected: value })),
      messages: "",
      setMessages: (value: string | ((prev: string) => string)) =>
        set((state) => ({
          messages: typeof value === "function" ? value(state.messages) : value,
        })),
      uploadFiles: [],
      setUploadFiles: (uploadFiles: UploadFile[]) => {
        return set(() => ({ uploadFiles }));
      },
      setSynthesizeItem(synthesizeItem?: SynthesizeItem) {
        return set(() => ({ synthesizeItem }));
      },

      chatSessions: {},
      curSessionId: "",
      setCurSessionId: (sessionId: string) => {
        set(() => ({ curSessionId: sessionId }));
      },
      setCurChatEnd: (value: boolean, sessionId: string) => {
        set((state) => ({
          chatSessions: {
            ...state.chatSessions,
            [sessionId]: {
              ...state.chatSessions[sessionId],
              curChatEnd: value,
            },
          },
        }));
      },
      clearChatSession: (sessionId: string) => {
        set((state) => {
          const newSessions = { ...state.chatSessions };
          delete newSessions[sessionId];
          return { chatSessions: newSessions };
        });
      },
    }),
    {
      name: "chat-state",
      // storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        chatSessions: state.chatSessions,
      }),
    }
  )
);

export const getCurChatEnd = (): boolean => {
  const chatSessions = useChatStore.getState().chatSessions;
  const curSessionId = useChatStore.getState().curSessionId;
  return chatSessions[curSessionId]?.curChatEnd ?? true;
};

export const useCurChatEnd = (): boolean => {
  return useChatStore((state) => {
    const { chatSessions, curSessionId } = state;
    return chatSessions[curSessionId]?.curChatEnd ?? true;
  });
};
