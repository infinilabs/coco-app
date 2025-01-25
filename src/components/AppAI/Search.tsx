import { useEffect, useState, useCallback, useRef } from "react";
import { Command } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
// import { isTauri } from "@tauri-apps/api/core";

import DropdownList from "./DropdownList";
import Footer from "./Footer";
import { tauriFetch } from "@/api/tauriFetchClient";
import noDataImg from "@/assets/coconut-tree.png";
import { useAppStore } from "@/stores/appStore";
// import { res_search2 } from "@/mock/index";
import { SearchResults } from "../SearchChat/SearchResults";
import { useSearchStore } from "@/stores/searchStore";

interface SearchProps {
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
}

function Search({ isChatMode, input }: SearchProps) {
  const appStore = useAppStore();

  const sourceData = useSearchStore((state) => state.sourceData);

  const [IsError, setIsError] = useState<boolean>(false);
  const [suggests, setSuggests] = useState<any[]>([]);
  const [SearchData, setSearchData] = useState<any>({});
  const [isSearchComplete, setIsSearchComplete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>();

  const mainWindowRef = useRef<HTMLDivElement>(null);
  // useEffect(() => {
  //   if (!isTauri()) return;
  //   const element = mainWindowRef.current;
  //   if (!element) return;

  //   const resizeObserver = new ResizeObserver(async (entries) => {
  //     const { getCurrentWebviewWindow } = await import(
  //       "@tauri-apps/api/webviewWindow"
  //     );
  //     const { LogicalSize } = await import("@tauri-apps/api/dpi");

  //     for (let entry of entries) {
  //       let newHeight = entry.contentRect.height;
  //       console.log("Height updated:", newHeight);
  //       newHeight = newHeight + 90 + (newHeight === 0 ? 0 : 46);
  //       await getCurrentWebviewWindow()?.setSize(
  //         new LogicalSize(680, newHeight)
  //       );
  //     }
  //   });

  //   resizeObserver.observe(element);

  //   return () => {
  //     resizeObserver.disconnect();
  //   };
  // }, [suggests]);

  const getSuggest = async () => {
    if (!input) return;
    //
    // mock
    // let list = res_search2?.hits?.hits;
    // setSuggests(list);
    // const search_data = list.reduce((acc: any, item) => {
    //   const name = item._source.source.name;
    //   if (!acc[name]) {
    //     acc[name] = [];
    //   }
    //   acc[name].push(item);
    //   return acc;
    // }, {});
    // setSearchData(search_data);
    // return;
    //
    try {
      // const response = await tauriFetch({
      //   url: `/query/_search?query=${input}`,
      //   method: "GET",
      //   baseURL: appStore.endpoint_http,
      // });

      const response: any = await invoke("query_coco_servers", { from: 0, size: 10,  query_strings: { query: input }  });
      // failed_coco_servers documents

      console.log("_suggest", input, response);
      let data = response?.documents || [];
      setSuggests(data);
      const search_data = data.reduce((acc: any, item: any) => {
        const name = item?.name;
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

  function debounce(fn: Function, delay: number) {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  const debouncedSearch = useCallback(debounce(getSuggest, 500), [input]);

  useEffect(() => {
    !isChatMode && !sourceData && debouncedSearch();
    if (!input) setSuggests([]);
  }, [input]);

  return (
    <div ref={mainWindowRef} className={`h-[500px] pb-10 w-full relative`}>
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
            No Results
          </div>
          <div className="mt-10 text-sm  text-[#333] dark:text-[#D8D8D8] flex">
            Ask Coco AI
            <span className="ml-3 w-5 h-5 rounded-[6px] border border-[#D8D8D8] flex justify-center items-center">
              <Command className="w-3 h-3" />
            </span>
            <span className="ml-1 w-5 h-5 rounded-[6px] border border-[#D8D8D8]  flex justify-center items-center">
              T
            </span>
          </div>
        </div>
      )}

      <Footer isChat={false} name={selectedItem?.source?.name} />
    </div>
  );
}

export default Search;
