import { useEffect, useState, useCallback, useRef } from "react";
import { debounce } from "lodash-es";

import DropdownList from "./DropdownList";
import { SearchResults } from "@/components/Search/SearchResults";
import { useSearchStore } from "@/stores/searchStore";
import ContextMenu from "./ContextMenu";
import { NoResults } from "@/components/Common/UI/NoResults";
import Footer from "@/components/Common/UI/Footer";
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";
import { useConnectStore } from "@/stores/connectStore";
import AskAi from "./AskAi";

interface SearchResponse {
  hits: Array<{
    _source: any;
    _score?: number;
    document: any;
    score?: number;
    source?: any;
  }>;
  total?: {
    value: number;
  };
  total_hits?: number;
  failed?: any[];
}

interface SearchProps {
  isTauri: boolean;
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
  hideCoco?: () => void;
  openSetting: () => void;
  setWindowAlwaysOnTop: (isPinned: boolean) => Promise<void>;
}

function Search({
  isTauri,
  isChatMode,
  input,
  hideCoco,
  openSetting,
  setWindowAlwaysOnTop,
}: SearchProps) {
  const sourceData = useSearchStore((state) => state.sourceData);
  const querySourceTimeout = useConnectStore((state) => {
    return state.querySourceTimeout;
  });

  const [isError, setIsError] = useState<any[]>([]);
  const [suggests, setSuggests] = useState<any[]>([]);
  const [searchData, setSearchData] = useState<any>({});
  const [isSearchComplete, setIsSearchComplete] = useState(false);

  const mainWindowRef = useRef<HTMLDivElement>(null);

  const querySourceTimeoutRef = useRef(querySourceTimeout);
  useEffect(() => {
    querySourceTimeoutRef.current = querySourceTimeout;
  }, [querySourceTimeout]);
  const goAskAi = useSearchStore((state) => state.goAskAi);

  const getSuggest = useCallback(
    async (searchInput: string) => {
      if (!searchInput) return;
      if (sourceData) return;

      let response: SearchResponse;
      if (isTauri) {
        response = await platformAdapter.commands("query_coco_fusion", {
          from: 0,
          size: 10,
          queryStrings: { query: searchInput },
          queryTimeout: querySourceTimeoutRef.current,
        });
        if (response && typeof response === "object" && "failed" in response) {
          const failedResult = response as any;
          setIsError(failedResult.failed || []);
        }
      } else {
        const [error, res]: any = await Get(
          `/query/_search?query=${searchInput}`
        );

        if (error) {
          console.error("_search", error);
          response = { hits: [], total_hits: 0 };
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
            hits: hits,
            total_hits: total,
          };
        }
      }
      console.log("_suggest", sourceData, searchInput, response);
      let data = response?.hits || [];

      setSuggests(data);

      const search_data = data.reduce((acc: any, item: any) => {
        const name = item?.document?.source?.name;
        if (!acc[name]) {
          acc[name] = [];
        }
        item.document.querySource = item?.source;
        acc[name].push(item);
        return acc;
      }, {});
      setSearchData(search_data);
      setIsSearchComplete(true);
    },
    [sourceData, isTauri]
  );
  const debouncedSearch = useCallback(
    debounce((value: string) => getSuggest(value), 300),
    [getSuggest]
  );
  useEffect(() => {
    if (!isChatMode && input) {
      debouncedSearch(input);
    } else if (!input && !sourceData) {
      setSuggests([]);
    }
  }, [input, isChatMode, debouncedSearch]);

  return (
    <div ref={mainWindowRef} className={`h-full pb-8 w-full relative`}>
      {/* Search Results Panel */}
      {goAskAi ? (
        <AskAi />
      ) : suggests.length > 0 ? (
        sourceData ? (
          <SearchResults input={input} isChatMode={isChatMode} />
        ) : (
          <DropdownList
            suggests={suggests}
            searchData={searchData}
            isError={isError}
            isSearchComplete={isSearchComplete}
            isChatMode={isChatMode}
          />
        )
      ) : (
        <NoResults />
      )}

      <Footer
        isTauri={isTauri}
        openSetting={openSetting}
        setWindowAlwaysOnTop={setWindowAlwaysOnTop}
      />

      <ContextMenu hideCoco={hideCoco} />
    </div>
  );
}

export default Search;
