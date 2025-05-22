import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ISearchStore = {
  sourceData: any;
  setSourceData: (sourceData: any) => void;
  sourceDataIds: string[];
  setSourceDataIds: (prevSourceDataId: string[]) => void;
  MCPIds: string[];
  setMCPIds: (prevSourceDataId: string[]) => void;
  visibleContextMenu: boolean;
  setVisibleContextMenu: (visibleContextMenu: boolean) => void;
  selectedSearchContent?: Record<string, any>;
  setSelectedSearchContent: (
    selectedSearchContent?: Record<string, any>
  ) => void;
  goAskAi: boolean;
  setGoAskAi: (goAskAi: boolean) => void;
  askAiMessage: string;
  setAskAiMessage: (askAiMessage: string) => void;
};

export const useSearchStore = create<ISearchStore>()(
  persist(
    (set) => ({
      sourceData: undefined,
      setSourceData: (sourceData: any) => set({ sourceData }),
      sourceDataIds: [],
      setSourceDataIds: (sourceDataIds: string[]) => set({ sourceDataIds }),
      MCPIds: [],
      setMCPIds: (MCPIds: string[]) => set({ MCPIds }),
      visibleContextMenu: false,
      setVisibleContextMenu: (visibleContextMenu) => {
        return set({ visibleContextMenu });
      },
      setSelectedSearchContent: (selectedSearchContent) => {
        return set({ selectedSearchContent });
      },
      goAskAi: false,
      setGoAskAi: (goAskAi) => {
        return set({ goAskAi });
      },
      askAiMessage: "",
      setAskAiMessage: (askAiMessage) => {
        return set({ askAiMessage });
      },
    }),
    {
      name: "search-store",
      partialize: (state) => ({
        sourceData: state.sourceData,
      }),
    }
  )
);
