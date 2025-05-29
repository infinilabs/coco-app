import { useState, useCallback, useMemo } from 'react';
import { debounce } from 'lodash-es';

import type { QueryHits, MultiSourceQueryResponse, FailedRequest, SearchDocument } from '@/types/search';
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";
import { useConnectStore } from "@/stores/connectStore";
import { useAppStore } from "@/stores/appStore";

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

  const { querySourceTimeout } = useConnectStore();

  const [searchState, setSearchState] = useState<SearchState>({
    isError: [],
    suggests: [],
    searchData: {},
    isSearchComplete: false,
    globalItemIndexMap: {}
  });

  const handleSearchResponse = (response: MultiSourceQueryResponse) => {
    const data = response?.hits || [];

    const searchData = data.reduce((acc: SearchDataBySource, item: QueryHits) => {
      const name = item?.document?.source?.name;
      if (name) {
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(item);
      }
      return acc;
    }, {});

    // Update indices and map
    console.log("_search response", data, searchData);
    const globalItemIndexMap: Record<number, SearchDocument> = {};
    let globalIndex = 0;
    for (const sourceName in searchData) {
      searchData[sourceName].map((item: QueryHits) => {
        item.document.querySource = item?.source;
        const index = globalIndex++;
        item.document.index = index
        globalItemIndexMap[index] = item.document;
        return item;
      })
    }

    setSearchState({
      isError: response.failed || [],
      suggests: data,
      searchData,
      isSearchComplete: true,
      globalItemIndexMap,
    });
  };

  const performSearch = useCallback(async (searchInput: string) => {
    if (!searchInput) {
      setSearchState(prev => ({ ...prev, suggests: [] }));
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
      const [error, res]: any = await Get(`/query/_search?query=${searchInput}`);
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

    console.log("_suggest", searchInput, response);

    handleSearchResponse(response);
  }, [querySourceTimeout, isTauri]);

  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  return {
    ...searchState,
    performSearch: debouncedSearch
  };
}