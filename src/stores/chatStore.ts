import { create } from "zustand";
import {
  persist,
  // createJSONStorage
} from "zustand/middleware";

export type IChatStore = {
  curChatEnd: boolean;
  setCurChatEnd: (value: boolean) => void;
  stopChat: boolean;
  setStopChat: (value: boolean) => void;
  connected: boolean;
  setConnected: (value: boolean) => void;
  messages: string;
  setMessages: (value: string | ((prev: string) => string)) => void;
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
    }),
    {
      name: "chat-state",
      // storage: createJSONStorage(() => sessionStorage),
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => key === "curChatEnd")
        ),
    }
  )
);
