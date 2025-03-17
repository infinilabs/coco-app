import { useEffect, useState, useCallback, useRef } from "react";
import { debounce } from "lodash-es";

import DropdownList from "./DropdownList";
import Footer from "./Footer";
import { SearchResults } from "@/components/Search/SearchResults";
import { useSearchStore } from "@/stores/searchStore";
import ContextMenu from "./ContextMenu";
import { NoResults } from "./NoResults";

interface SearchProps {
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
  querySearch: (input: string) => Promise<any>;
  queryDocuments: (
    from: number,
    size: number,
    queryStrings: any
  ) => Promise<any>;
  hideCoco: () => Promise<any>;
  openSetting: () => void;
  setWindowAlwaysOnTop: (isPinned: boolean) => Promise<void>;
}

function Search({
  isChatMode,
  input,
  querySearch,
  queryDocuments,
  hideCoco,
  openSetting,
  setWindowAlwaysOnTop,
}: SearchProps) {
  const sourceData = useSearchStore((state) => state.sourceData);

  const [IsError, setIsError] = useState<boolean>(false);
  const [suggests, setSuggests] = useState<any[]>([]);
  const [SearchData, setSearchData] = useState<any>({});
  const [isSearchComplete, setIsSearchComplete] = useState(false);

  const mainWindowRef = useRef<HTMLDivElement>(null);

  const getSuggest = async () => {
    if (!input) return;
    try {
      const response = await querySearch(input);

      console.log("_suggest", input, response);
      let data = response?.hits || [];

      setSuggests(data);

      const search_data = data.reduce((acc: any, item: any) => {
        const name = item?.document?.source?.name;
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(item);
        return acc;
      }, {});

      setSearchData(search_data);

      setIsError(false);
      setIsSearchComplete(true);
    } catch (error) {
      setSuggests([]);
      setIsError(true);
      console.error("query_coco_fusion:", error);
    }
  };

  const debouncedSearch = useCallback(debounce(getSuggest, 500), [input]);

  useEffect(() => {
    !isChatMode && !sourceData && debouncedSearch();
    if (!input) setSuggests([]);
  }, [input]);

  return (
    <div
      ref={mainWindowRef}
      className={`h-[calc(100vh-90px)] pb-10 w-full relative`}
    >
      {/* Search Results Panel */}
      {suggests.length > 0 ? (
        sourceData ? (
          <SearchResults
            input={input}
            isChatMode={isChatMode}
            queryDocuments={queryDocuments}
          />
        ) : (
          <DropdownList
            suggests={suggests}
            SearchData={SearchData}
            IsError={IsError}
            isSearchComplete={isSearchComplete}
            isChatMode={isChatMode}
          />
        )
      ) : (
        <NoResults />
      )}

      <Footer
        openSetting={openSetting}
        setWindowAlwaysOnTop={setWindowAlwaysOnTop}
      />

      <ContextMenu hideCoco={hideCoco} />
    </div>
  );
}

export default Search;
