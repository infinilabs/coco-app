import { SearchExtensionItem } from "@/components/Search/ExtensionStore";
import {
  ExtensionPermission,
  ViewExtensionUISettings,
} from "@/components/Settings/Extensions";
import { Aggregations } from "@/types/search";
import { DateRange } from "react-day-picker";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewExtensionOpened = [
  // Extension name
  string,
  // An absolute path to the extension icon or a font code.
  string,
  // HTML file URL
  string,
  ExtensionPermission | null,
  ViewExtensionUISettings | null
];

export interface AggregateFilter {
  [key: string]: string[];
}

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
  targetServerId?: string;
  setTargetServerId: (targetServerId?: string) => void;
  targetAssistantId?: string;
  setTargetAssistantId: (targetAssistantId?: string) => void;
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

  // When we open a View extension, we set this to a non-null value.
  viewExtensionOpened?: ViewExtensionOpened;
  setViewExtensionOpened: (showViewExtension?: ViewExtensionOpened) => void;

  enabledFuzzyMatch: boolean;
  setEnabledFuzzyMatch: (enabledFuzzyMatch: boolean) => void;

  fuzziness: number;
  setFuzziness: (fuzziness: number) => void;

  filterDateRange?: DateRange;
  setFilterDateRange: (filterDateRange?: DateRange) => void;

  aggregateFilter?: AggregateFilter;
  setAggregateFilter: (aggregateFilter?: AggregateFilter) => void;

  aggregations?: Aggregations;
  setAggregations: (aggregations?: Aggregations) => void;
};

export const DEFAULT_FUZZINESS = 3;

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
      setTargetServerId: (targetServerId) => {
        return set({ targetServerId });
      },
      setTargetAssistantId: (targetAssistantId) => {
        return set({ targetAssistantId });
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
      setViewExtensionOpened: (viewExtensionOpened) => {
        return set({ viewExtensionOpened });
      },
      enabledFuzzyMatch: false,
      setEnabledFuzzyMatch: (enabledFuzzyMatch) => {
        return set({ enabledFuzzyMatch });
      },
      fuzziness: DEFAULT_FUZZINESS,
      setFuzziness: (fuzziness) => {
        return set({ fuzziness });
      },
      setFilterDateRange(filterDateRange) {
        return set({ filterDateRange });
      },
      setAggregateFilter: (aggregateFilter) => {
        return set({ aggregateFilter });
      },
      setAggregations: (aggregations) => {
        return set({ aggregations });
      },
    }),
    {
      name: "search-store",
      partialize: (state) => ({
        sourceData: state.sourceData,
        fuzziness: state.fuzziness,
      }),
    }
  )
);
