import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  Bolt,
  X,
  SquareArrowRight,
  UserRoundPen,
} from "lucide-react";

import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import HugoImg from "@/assets/hugo_site/icon.png";
import WebImg from "@/assets/hugo_site/web.png";

type ISearchData = Record<string, any[]>;

interface DropdownListProps {
  selected: (item: any) => void;
  suggests: any[];
  SearchData: ISearchData;
  IsError: boolean;
  isSearchComplete: boolean;
}

function DropdownList({
  selected,
  suggests,
  SearchData,
  IsError,
}: DropdownListProps) {
  const connector_data = useAppStore((state) => state.connector_data);
  const setSourceData = useSearchStore((state) => state.setSourceData);

  const [showError, setShowError] = useState<boolean>(IsError);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [showIndex, setShowIndex] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleOpenURL = async (url: string) => {
    if (!url) return;
    try {
      if (isTauri()) {
        await open(url);
        console.log("URL opened in default browser");
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    console.log(
      "handleKeyDown",
      e.key,
      showIndex,
      e.key >= "0" && e.key <= "9" && showIndex
    );
    if (!suggests.length) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedItem((prev) =>
        prev === null || prev === 0 ? suggests.length - 1 : prev - 1
      );
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedItem((prev) =>
        prev === null || prev === suggests.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === "Meta") {
      e.preventDefault();
      setShowIndex(true);
    }

    if (e.key === "Enter" && selectedItem !== null) {
      console.log("Enter key pressed", selectedItem);
      const item = suggests[selectedItem];
      if (item?._source?.url) {
        handleOpenURL(item?._source?.url);
      } else {
        selected(item);
      }
    }

    if (e.key >= "0" && e.key <= "9" && showIndex) {
      console.log(`number ${e.key}`);
      const item = suggests[parseInt(e.key, 10)];
      if (item?._source?.url) {
        handleOpenURL(item?._source?.url);
      } else {
        selected(item);
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    console.log("handleKeyUp", e.key);
    if (!suggests.length) return;

    if (!e.metaKey) {
      setShowIndex(false);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [showIndex, selectedItem, suggests]);

  useEffect(() => {
    if (selectedItem !== null && itemRefs.current[selectedItem]) {
      itemRefs.current[selectedItem]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedItem]);

  function getTypeIcon(name: string) {
    const result = connector_data.find(
      (item: any) => item._source.category === name
    );
    const icons = result?._source?.assets?.icons || {};
    console.log(2222, icons, name);
    return icons[name] || HugoImg;
  }

  function getIcon(_source: any) {
    const name = _source?.source?.name || "";
    const result = connector_data.find(
      (item: any) => item._source.category === name
    );
    const icons = result?._source?.assets?.icons || {};
    console.log(11111, icons, name, _source.icon, icons[_source.icon]);
    return icons[_source.icon] || WebImg;
  }

  function goToTwoPage(name: string) {
    selected &&
      selected({
        name,
      });
    setSourceData({
      name,
    });
  }

  return (
    <div
      ref={containerRef}
      data-tauri-drag-region
      className="h-[458px] w-full p-2 flex flex-col overflow-y-auto custom-scrollbar focus:outline-none"
      tabIndex={0}
    >
      {showError ? (
        <div className="flex items-center gap-2 text-sm text-[#333] p-2">
          <CircleAlert className="text-[#FF0000] w-[14px] h-[14px]" />
          Coco server is unavailable, only local results and available services
          are displayed.
          <Bolt className="text-[#000] w-[14px] h-[14px] cursor-pointer" />
          <X
            className="text-[#666] w-[16px] h-[16px] cursor-pointer"
            onClick={() => setShowError(false)}
          />
        </div>
      ) : null}
      {Object.entries(SearchData).map(([sourceName, items]) => (
        <div key={sourceName}>
          <div className="p-2 text-xs text-[#999] dark:text-[#666] flex items-center gap-2.5">
            <img className="w-4 h-4" src={getTypeIcon(sourceName)} alt="icon" />
            {sourceName}
            <div className="flex-1 border-b border-b-[#e6e6e6] dark:border-b-[#272626]"></div>
            <SquareArrowRight
              className="w-4 h-4 cursor-pointer"
              onClick={() => goToTwoPage(sourceName)}
            />
          </div>
          {items.map((item: any, index: number) => {
            const isSelected = selectedItem === index;
            return (
              <div
                key={item._id}
                ref={(el) => (itemRefs.current[index] = el)}
                onMouseEnter={() => setSelectedItem(index)}
                onClick={() => {
                  if (item?._source?.url) {
                    handleOpenURL(item?._source?.url);
                  } else {
                    selected(item);
                  }
                }}
                className={`w-full px-2 py-2.5 text-sm flex items-center justify-between rounded-lg transition-colors ${
                  isSelected
                    ? "text-white bg-[#6000FF] hover:bg-[#6000FF]"
                    : "text-[#333] dark:text-[#d8d8d8]"
                }`}
              >
                <div className="flex gap-2 items-center justify-start w-[400px]">
                  <img
                    className="w-5 h-5"
                    src={getIcon(item?._source)}
                    alt="icon"
                  />
                  <span className="text-sm font-medium truncate text-left">
                    {item?._source?.title}
                  </span>
                  <span
                    className={`text-[12px] ${
                      isSelected
                        ? "text-[#DCDCDC]"
                        : "text-[#999] dark:text-[#666]"
                    }  max-w-[120px] truncate`}
                  >
                    {(item?._source?.category || "") +
                      (item?._source?.subcategory
                        ? `/${item?._source?.subcategory}`
                        : "")}
                  </span>
                </div>
                <div className="flex gap-2 items-center justify-end w-52 relative">
                  <UserRoundPen
                    className={`w-4 h-4 ${
                      isSelected ? "text-[#C8C8C8]" : "text-[#666]"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isSelected ? "text-[#C8C8C8]" : "text-[#666]"
                    } max-w-[100px] truncate text-right`}
                  >
                    {item?._source?.author || item?._source?.source?.name}
                  </span>
                  {isSelected ? (
                    <div
                      className={`absolute right-7 w-4 h-4 flex items-end justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
                        isSelected ? "shadow-[-6px_0px_6px_2px_#6000FF]" : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
                      }`}
                    >
                      ↩︎
                    </div>
                  ) : null}
                  
                  {showIndex && index < 10 ? (
                    <div
                      className={`absolute right-0 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
                        isSelected ? "shadow-[-6px_0px_6px_2px_#6000FF]" : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
                      }`}
                    >
                      {index}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default DropdownList;
