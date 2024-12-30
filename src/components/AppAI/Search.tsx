import { useEffect, useState, useCallback, useRef } from "react";
// import { isTauri } from "@tauri-apps/api/core";

import DropdownList from "./DropdownList";
import Footer from "./Footer";
import { tauriFetch } from "@/api/tauriFetchClient";

interface SearchProps {
  changeInput: (val: string) => void;
  isChatMode: boolean;
  input: string;
}

function Search({ isChatMode, input }: SearchProps) {
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
    const list = [];
    for (let i = 0; i < input.length; i++) {
      list.push({
        _source: { url: `https://www.google.com/search?q=${i}`, _id: i },
      });
    }
    setSuggests(list);
    return
    //
    try {
      const response = await tauriFetch({
        url: `/query/_search?query=${input}`,
        method: "GET",
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
      <DropdownList
        suggests={suggests}
        isSearchComplete={isSearchComplete}
        selected={(item) => setSelectedItem(item)}
      />

      <Footer isChat={false} name={selectedItem?.source} />
    </div>
  );
}

export default Search;
