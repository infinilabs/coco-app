import { useState, useCallback, useMemo, useRef } from "react";
import { debounce, orderBy } from "lodash-es";

import type {
  QueryHits,
  MultiSourceQueryResponse,
  FailedRequest,
  SearchDocument,
} from "@/types/search";
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { useExtensionsStore } from "@/stores/extensionsStore";

interface SearchState {
  isError: FailedRequest[];
  suggests: QueryHits[];
  searchData: SearchDataBySource;
  isSearchComplete: boolean;
  globalItemIndexMap: Record<number, SearchDocument>;
}

interface SearchDataBySource {
  [sourceName: string]: QueryHits[];
}

export function useSearch() {
  const isTauri = useAppStore((state) => state.isTauri);
  const enabledAiOverview = useSearchStore((state) => {
    return state.enabledAiOverview;
  });
  const aiOverviewServer = useExtensionsStore((state) => {
    return state.aiOverviewServer;
  });
  const aiOverviewAssistant = useExtensionsStore((state) => {
    return state.aiOverviewAssistant;
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const disabledExtensions = useExtensionsStore((state) => {
    return state.disabledExtensions;
  });
  const aiOverviewCharLen = useExtensionsStore((state) => {
    return state.aiOverviewCharLen;
  });
  const aiOverviewDelay = useExtensionsStore((state) => {
    return state.aiOverviewDelay;
  });
  const aiOverviewMinQuantity = useExtensionsStore((state) => {
    return state.aiOverviewMinQuantity;
  });

  const { querySourceTimeout } = useConnectStore();

  const [searchState, setSearchState] = useState<SearchState>({
    isError: [],
    suggests: [],
    searchData: {},
    isSearchComplete: false,
    globalItemIndexMap: {},
  });

  const handleSearchResponse = (
    response: MultiSourceQueryResponse,
    searchInput: string
  ) => {
    const hits = response?.hits ?? [];

    const data = orderBy(hits, "score", "desc");

    const searchData = data.reduce(
      (acc: SearchDataBySource, item: QueryHits) => {
        const name = item?.document?.source?.name;
        if (name) {
          if (!acc[name]) {
            acc[name] = [];
          }
          acc[name].push(item);
        }
        return acc;
      },
      {}
    );

    // Update indices and map
    //console.log("_search response", data, searchData);
    const globalItemIndexMap: Record<number, SearchDocument> = {};
    let globalIndex = 0;
    for (const sourceName in searchData) {
      searchData[sourceName].map((item: QueryHits) => {
        item.document.querySource = item?.source;
        const index = globalIndex++;
        item.document.index = index;
        globalItemIndexMap[index] = item.document;
        return item;
      });
    }

    const filteredData = data.filter((item: any) => {
      return (
        item?.source?.type === "coco-servers" &&
        item?.document?.type !== "AI Assistant"
      );
    });

    if (
      searchInput.length >= aiOverviewCharLen &&
      isTauri &&
      enabledAiOverview &&
      aiOverviewServer &&
      aiOverviewAssistant &&
      filteredData.length >= aiOverviewMinQuantity &&
      !disabledExtensions.includes("AIOverview")
    ) {
      timerRef.current = setTimeout(() => {
        const id = "AI Overview";

        const payload = {
          source: {
            id,
            type: id,
          },
          document: {
            index: -1,
            id,
            category: id,
            payload: {
              message: JSON.stringify({
                query: searchInput,
                result: filteredData,
              }),
            },
            source: {
              icon: "font_a-AIOverview",
            },
          },
        };

        setSearchState((prev) => ({
          ...prev,
          suggests: prev.suggests.concat(payload as any),
          searchData: {
            [id]: [payload as any],
            ...prev.searchData,
          },
        }));
      }, aiOverviewDelay * 1000);
    }

    setSearchState({
      isError: response.failed || [],
      suggests: data,
      searchData,
      isSearchComplete: true,
      globalItemIndexMap,
    });
  };

  const performSearch = useCallback(
    async (searchInput: string) => {
      if (!searchInput) {
        setSearchState((prev) => ({ ...prev, suggests: [] }));
        return;
      }

      let response: MultiSourceQueryResponse;
      if (isTauri) {
        response = await platformAdapter.commands("query_coco_fusion", {
          from: 0,
          size: 10,
          queryStrings: { query: searchInput },
          queryTimeout: querySourceTimeout,
        });
      } else {
        const [error, res]: any = await Get(
          `/query/_search?query=${searchInput}`
        );

        if (error) {
          console.error("_search", error);
          response = { failed: [], hits: [], total_hits: 0 };
        } else {
          const hits =
            res?.hits?.hits?.map((hit: any) => ({
              document: {
                ...hit._source,
              },
              score: hit._score || 0,
              source: hit._source.source || null,
            })) || [];
          const total = res?.hits?.total?.value || 0;
          response = {
            failed: [],
            hits: hits,
            total_hits: total,
          };
        }
      }

      //console.log("_suggest", searchInput, response);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      handleSearchResponse(response, searchInput);
    },
    [
      querySourceTimeout,
      isTauri,
      enabledAiOverview,
      aiOverviewServer,
      aiOverviewAssistant,
      disabledExtensions,
      aiOverviewCharLen,
      aiOverviewDelay,
      aiOverviewMinQuantity,
    ]
  );

  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  return {
    ...searchState,
    performSearch: debouncedSearch,
  };
}
