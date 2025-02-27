import { useEffect, useState, useCallback, useRef } from "react";
import { Command } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { debounce } from "lodash-es";

import DropdownList from "./DropdownList";
import Footer from "./Footer";
import noDataImg from "@/assets/coconut-tree.png";
import { SearchResults } from "@/components/Search/SearchResults";
import { useSearchStore } from "@/stores/searchStore";
import { isMac } from "@/utils/platform";
import ContextMenu from "./ContextMenu";

interface SearchProps {
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
}

function Search({ isChatMode, input }: SearchProps) {
  const { t } = useTranslation();
  const sourceData = useSearchStore((state) => state.sourceData);

  const [IsError, setIsError] = useState<boolean>(false);
  const [suggests, setSuggests] = useState<any[]>([]);
  const [SearchData, setSearchData] = useState<any>({});
  const [isSearchComplete, setIsSearchComplete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>();

  const mainWindowRef = useRef<HTMLDivElement>(null);

  const getSuggest = async () => {
    if (!input) return;
    try {
      const response: any = await invoke("query_coco_fusion", {
        from: 0,
        size: 10,
        queryStrings: { query: input },
      });

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
      console.error("Failed to fetch user data:", error);
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
          <SearchResults input={input} isChatMode={isChatMode} />
        ) : (
          <DropdownList
            suggests={suggests}
            SearchData={SearchData}
            IsError={IsError}
            isSearchComplete={isSearchComplete}
            isChatMode={isChatMode}
            selected={(item) => setSelectedItem(item)}
          />
        )
      ) : (
        <div
          data-tauri-drag-region
          className="h-full w-full flex flex-col items-center"
        >
          <img src={noDataImg} alt="no-data" className="w-16 h-16 mt-24" />
          <div className="mt-4 text-sm text-[#999] dark:text-[#666]">
            {t("search.main.noResults")}
          </div>
          <div className="mt-10 text-sm  text-[#333] dark:text-[#D8D8D8] flex">
            {t("search.main.askCoco")}
            {isMac ? (
              <span className="ml-3 w-5 h-5 rounded-[6px] border border-[#D8D8D8] flex justify-center items-center">
                <Command className="w-3 h-3" />
              </span>
            ) : (
              <span className="ml-3 w-8 h-5 rounded-[6px] border border-[#D8D8D8] flex justify-center items-center">
                <span className="h-3 leading-3 inline-flex items-center text-xs">
                  Ctrl
                </span>
              </span>
            )}
            <span className="ml-1 w-5 h-5 rounded-[6px] border border-[#D8D8D8]  flex justify-center items-center">
              T
            </span>
          </div>
        </div>
      )}

      <Footer isChat={false} name={selectedItem?.source?.name} />

      <ContextMenu />
    </div>
  );
}

export default Search;
