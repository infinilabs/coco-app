import { useEffect, useState, useCallback, useRef } from "react";
import { Command } from "lucide-react";

// import { isTauri } from "@tauri-apps/api/core";

import DropdownList from "./DropdownList";
import Footer from "./Footer";
import { tauriFetch } from "@/api/tauriFetchClient";
import noDataImg from "@/assets/coconut-tree.png";
import { useAppStore } from '@/stores/appStore';

interface SearchProps {
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
}

function Search({ isChatMode, input }: SearchProps) {
  const appStore = useAppStore();

  const [suggests, setSuggests] = useState<any[]>([]);
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
    // const list = [];
    // for (let i = 0; i < input.length; i++) {
    //   list.push({
    //     _source: { url: `https://www.google.com/search?q=${i}`, _id: i },
    //   });
    // }
    // setSuggests(list);
    // return;
    //
    try {
      const response = await tauriFetch({
        url: `/query/_search?query=${input}`,
        method: "GET",
        baseURL: appStore.endpoint_http,
      });
      console.log("_suggest", input, response);
      const data = response.data?.hits?.hits || [];
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
    if (!input) setSuggests([]);
  }, [input]);

  return (
    <div ref={mainWindowRef} className={`h-[500px] pb-10 w-full relative`}>
      {/* Search Results Panel */}
      {suggests.length > 0 ? (
        <DropdownList
          suggests={suggests}
          isSearchComplete={isSearchComplete}
          selected={(item) => setSelectedItem(item)}
        />
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
