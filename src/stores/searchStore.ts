import { SearchExtensionItem } from "@/components/Search/ExtensionStore";
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
  askAiSessionId?: string;
  setAskAiSessionId: (askAiSessionId?: string) => void;
  selectedAssistant?: any;
  setSelectedAssistant: (selectedAssistant?: any) => void;
  askAiServerId?: string;
  setAskAiServerId: (askAiServerId?: string) => void;
  enabledAiOverview: boolean;
  setEnabledAiOverview: (enabledAiOverview: boolean) => void;
  askAiAssistantId?: string;
  setAskAiAssistantId: (askAiAssistantId?: string) => void;
  visibleExtensionStore: boolean;
  setVisibleExtensionStore: (visibleExtensionStore: boolean) => void;
  searchValue: string;
  setSearchValue: (searchValue: string) => void;
  selectedExtension?: SearchExtensionItem;
  setSelectedExtension: (selectedExtension?: SearchExtensionItem) => void;
  installingExtensions: string[];
  setInstallingExtensions: (installingExtensions: string[]) => void;
  uninstallingExtensions: string[];
  setUninstallingExtensions: (uninstallingExtensions: string[]) => void;
  visibleExtensionDetail: boolean;
  setVisibleExtensionDetail: (visibleExtensionDetail: boolean) => void;
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
      setAskAiSessionId: (askAiSessionId) => {
        return set({ askAiSessionId });
      },
      setSelectedAssistant: (selectedAssistant) => {
        return set({ selectedAssistant });
      },
      setAskAiServerId: (askAiServerId) => {
        return set({ askAiServerId });
      },
      enabledAiOverview: false,
      setEnabledAiOverview: (enabledAiOverview) => {
        return set({ enabledAiOverview });
      },
      setAskAiAssistantId: (askAiAssistantId) => {
        return set({ askAiAssistantId });
      },
      visibleExtensionStore: false,
      setVisibleExtensionStore: (visibleExtensionStore) => {
        return set({ visibleExtensionStore });
      },
      searchValue: "",
      setSearchValue: (searchValue) => {
        return set({ searchValue });
      },
      setSelectedExtension(selectedExtension) {
        return set({ selectedExtension });
      },
      installingExtensions: [],
      setInstallingExtensions: (installingExtensions) => {
        return set({ installingExtensions });
      },
      uninstallingExtensions: [],
      setUninstallingExtensions: (uninstallingExtensions) => {
        return set({ uninstallingExtensions });
      },
      visibleExtensionDetail: false,
      setVisibleExtensionDetail: (visibleExtensionDetail) => {
        return set({ visibleExtensionDetail });
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
