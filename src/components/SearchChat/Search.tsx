import { useEffect, useState, useCallback, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";

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
  const [selectedItem, setSelectedItem] = useState<any>();

  const mainWindowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isTauri()) return;
    const element = mainWindowRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(async (entries) => {
      const { getCurrentWebviewWindow } = await import(
        "@tauri-apps/api/webviewWindow"
      );
      const { LogicalSize } = await import("@tauri-apps/api/dpi");

      for (let entry of entries) {
        let newHeight = entry.contentRect.height;
        console.log("Height updated:", newHeight);
        newHeight = newHeight + 90 + (newHeight === 0 ? 0 : 46);
        await getCurrentWebviewWindow()?.setSize(
          new LogicalSize(680, newHeight)
        );
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [suggests]);

  const getSuggest = async () => {
    if (!input) return
    try {
      const response = await tauriFetch({
        url: `/query/_search?query=${input}`,
        method: "GET",
      });
      console.log("_suggest", input, response);
      const data = response.data?.hits?.hits || [];
      setSuggests(data);
      //
      // const list = [];
      // for (let i = 0; i < input.length; i++) {
      //   list.push({
      //     _source: { url: `https://www.google.com/search?q=${i}` },
      //   });
      // }
      // setSuggests(list);
      //
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
    if (!input) setSuggests([]);
  }, [input]);

  if (isChatMode || suggests.length === 0) return null;

  return (
    <div
      className={`rounded-xl overflow-hidden bg-search_bg_light dark:bg-search_bg_dark bg-cover border border-[#E6E6E6] dark:border-[#272626] absolute w-full transition-opacity ${
        isTransitioned ? "opacity-0 pointer-events-none" : "opacity-100"
      } top-[96px]`}
      style={{
        backgroundPosition: "-1px 0",
        backgroundSize: "101% 100%",
      }}
    >
      {!isChatMode ? (
        <div
          ref={mainWindowRef}
          className={`max-h-[498px] pb-10 w-full relative`}
        >
          {/* Search Results Panel */}
          {suggests.length > 0 && !selectedItem ? (
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
      ) : null}
    </div>
  );
}

export default Search;
