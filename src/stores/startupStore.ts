import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

type DefaultStartupWindow = "searchMode" | "chatMode";
type DefaultContentForSearchWindow = "systemDefault";
type DefaultContentForChatWindow = "newChat" | "oldChat";

export type IStartupStore = {
  defaultStartupWindow: DefaultStartupWindow;
  setDefaultStartupWindow: (defaultStartupWindow: DefaultStartupWindow) => void;
  defaultContentForSearchWindow: DefaultContentForSearchWindow;
  setDefaultContentForSearchWindow: (
    defaultContentForSearchWindow: DefaultContentForSearchWindow
  ) => void;
  defaultContentForChatWindow: DefaultContentForChatWindow;
  setDefaultContentForChatWindow: (
    defaultContentForChatWindow: DefaultContentForChatWindow
  ) => void;
};

export const useStartupStore = create<IStartupStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        defaultStartupWindow: "searchMode",
        setDefaultStartupWindow: (defaultStartupWindow) => {
          return set({ defaultStartupWindow });
        },
        defaultContentForSearchWindow: "systemDefault",
        setDefaultContentForSearchWindow: (defaultContentForSearchWindow) => {
          return set({ defaultContentForSearchWindow });
        },
        defaultContentForChatWindow: "oldChat",
        setDefaultContentForChatWindow: (defaultContentForChatWindow) => {
          return set({ defaultContentForChatWindow });
        },
      }),
      {
        name: "startup-store",
        partialize: (state) => ({
          defaultStartupWindow: state.defaultStartupWindow,
          defaultContentForSearchWindow: state.defaultContentForSearchWindow,
          defaultContentForChatWindow: state.defaultContentForChatWindow,
        }),
      }
    )
  )
);
