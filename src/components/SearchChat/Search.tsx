import { useEffect, useState, useCallback } from "react";
// import {
//   WebviewWindow,
//   getCurrentWebviewWindow,
// } from "@tauri-apps/api/webviewWindow";
// import { LogicalSize } from "@tauri-apps/api/dpi";

import DropdownList from "./DropdownList";
import { Footer } from "./Footer";
import { SearchResults } from "./SearchResults";
import { tauriFetch } from "../../api/tauriFetchClient";

interface SearchProps {
  changeInput: (val: string) => void;
  isTransitioned: boolean;
  isChatMode: boolean;
  input: string;
}

function Search({ isTransitioned, isChatMode, input }: SearchProps) {
  const [suggests, setSuggests] = useState<any[]>([]);
  const [isSearchComplete, setIsSearchComplete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const getSuggest = async () => {
    try {
      const response = await tauriFetch({
        url: `/query/_search?query=${input}`,
        method: "GET",
      });
      console.log("_suggest", input, response);
      const data = response.data?.hits?.hits || [];
      // if (data.length > 0) {
      //   await getCurrentWebviewWindow().setSize(new LogicalSize(680, 600));
      // } else {
      //   await getCurrentWebviewWindow().setSize(new LogicalSize(680, 90));
      // }
      setSuggests(data);
      setIsSearchComplete(true);
    } catch (error) {
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

  const debouncedSearch = useCallback(debounce(getSuggest, 300), [input]);

  useEffect(() => {
    !isChatMode && debouncedSearch();
  }, [input]);

  if (isChatMode || suggests.length === 0) return null;

  return (
    <div
      className={`shadow-window-custom rounded-xl overflow-hidden bg-search_bg_light dark:bg-search_bg_dark bg-cover border border-[#E6E6E6] dark:border-[#272626] absolute w-full transition-opacity duration-500 ${
        isTransitioned ? "opacity-0 pointer-events-none" : "opacity-100"
      } top-[96px]`}
      style={{
        backgroundPosition: "-1px 0",
        backgroundSize: "101% 100%",
      }}
    >
      {isChatMode ? null : (
        <div className={`max-h-[498px] pb-10 w-full relative`}>
          {/* Search Results Panel */}
          {suggests.length > 0 ? (
            <DropdownList
              suggests={suggests}
              isSearchComplete={isSearchComplete}
              selected={(item) => setSelectedItem(item)}
            />
          ) : null}

          {selectedItem ? <SearchResults /> : null}

          {suggests.length > 0 || selectedItem ? (
            <Footer isChat={false} name={selectedItem?.source} />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default Search;
