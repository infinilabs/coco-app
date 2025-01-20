import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  Bolt,
  X,
  SquareArrowRight,
  // UserRoundPen,
} from "lucide-react";

import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import source_default_img from "@/assets/images/source_default.png";
import file_efault_img from "@/assets/images/file_efault.png";

type ISearchData = Record<string, any[]>;

interface DropdownListProps {
  selected: (item: any) => void;
  suggests: any[];
  SearchData: ISearchData;
  IsError: boolean;
  isSearchComplete: boolean;
  isChatMode: boolean;
}

function DropdownList({
  selected,
  suggests,
  SearchData,
  IsError,
  isChatMode,
}: DropdownListProps) {
  let globalIndex = 0;
  const globalItemIndexMap: any[] = [];

  const connector_data = useAppStore((state) => state.connector_data);
  const datasourceData = useAppStore((state) => state.datasourceData);
  const endpoint_http = useAppStore((state) => state.endpoint_http);
  const setSourceData = useSearchStore((state) => state.setSourceData);

  const [showError, setShowError] = useState<boolean>(IsError);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [showIndex, setShowIndex] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    isChatMode && setSelectedItem(null);
  }, [isChatMode]);

  const handleOpenURL = async (url: string) => {
    if (!url) return;
    try {
      if (isTauri()) {
        await open(url);
        // console.log("URL opened in default browser");
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // console.log(
    //   "handleKeyDown",
    //   e.key,
    //   showIndex,
    //   e.key >= "0" && e.key <= "9" && showIndex
    // );
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
      // console.log("Enter key pressed", selectedItem);
      const item = globalItemIndexMap[selectedItem];
      if (item?._source?.url) {
        handleOpenURL(item?._source?.url);
      } else {
        selected(item);
      }
    }

    if (e.key >= "0" && e.key <= "9" && showIndex) {
      // console.log(`number ${e.key}`);
      const item = globalItemIndexMap[parseInt(e.key, 10)];
      if (item?._source?.url) {
        handleOpenURL(item?._source?.url);
      } else {
        selected(item);
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // console.log("handleKeyUp", e.key);
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

  function findConnectorIcon(item: any) {
    const id = item?._source?.source?.id || "";

    const result_source = datasourceData.find(
      (data: any) => data._source.id === id
    );

    const connector_id = result_source?._source?.connector?.id;

    const result_connector = connector_data.find(
      (data: any) => data._source.id === connector_id
    );

    return result_connector?._source;
  }

  function getTypeIcon(item: any) {
    const connectorSource = findConnectorIcon(item);
    const icons = connectorSource?.icon;

    if (!icons) {
      return source_default_img;
    }

    if (icons?.includes("http")) {
      return icons;
    } else {
      return endpoint_http + icons;
    }
  }

  function getIcon(item: any) {
    const connectorSource = findConnectorIcon(item);
    const icons = connectorSource?.assets?.icons || {};

    const selectedIcon = icons[item?._source?.icon];

    if (!selectedIcon) {
      return file_efault_img;
    }

    if (selectedIcon?.includes("http")) {
      return selectedIcon;
    } else {
      return endpoint_http + selectedIcon;
    }
  }

  function getRichIcon(item: any) {
    const connectorSource = findConnectorIcon(item);
    const icons = connectorSource?.assets?.icons || {};

    const selectedIcon = icons[item?._source?.rich_categories?.[0]?.icon];

    if (!selectedIcon) {
      return source_default_img;
    }

    if (selectedIcon?.includes("http")) {
      return selectedIcon;
    } else {
      return endpoint_http + selectedIcon;
    }
  }

  function goToTwoPage(item: any) {
    setSourceData(item);
    selected && selected(item);
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
            <img className="w-4 h-4" src={getTypeIcon(items[0])} alt="icon" />
            {sourceName}
            <div className="flex-1 border-b border-b-[#e6e6e6] dark:border-b-[#272626]"></div>
            <SquareArrowRight
              className="w-4 h-4 cursor-pointer"
              onClick={() => goToTwoPage(items[0])}
            />
          </div>
          {items.map((item: any) => {
            const isSelected = selectedItem === globalIndex;
            const currentIndex = globalIndex;
            globalItemIndexMap.push(item);
            globalIndex++;
            return (
              <div
                key={item._id}
                ref={(el) => (itemRefs.current[currentIndex] = el)}
                onMouseEnter={() => setSelectedItem(currentIndex)}
                onClick={() => {
                  if (item?._source?.url) {
                    handleOpenURL(item?._source?.url);
                  } else {
                    selected(item);
                  }
                }}
                className={`w-full px-2 py-2.5 text-sm flex items-center justify-between rounded-lg transition-colors ${
                  isSelected
                    ? "text-white bg-[#950599] hover:bg-[#950599]"
                    : "text-[#333] dark:text-[#d8d8d8]"
                }`}
              >
                <div className="flex gap-2 items-center justify-start w-[400px]">
                  <img className="w-5 h-5" src={getIcon(item)} alt="icon" />
                  <span
                    className={`text-sm  truncate text-left ${
                      isSelected ? "font-medium" : ""
                    }`}
                  >
                    {item?._source?.title}
                  </span>
                </div>
                <div className="text-[12px] flex gap-2 items-center justify-end w-52 relative">
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
                  {item?._source?.rich_categories ? (
                    <img
                      className="w-4 h-4 cursor-pointer"
                      src={getRichIcon(item)}
                      alt="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToTwoPage(item);
                      }}
                    />
                  ) : null}
                  {item?._source?.rich_categories ? (
                    <span
                      className={`${
                        isSelected ? "text-[#C8C8C8]" : "text-[#666]"
                      } max-w-[180px] truncate text-right`}
                    >
                      {item?._source?.rich_categories?.[0]?.label ||
                        item?._source?.source?.name}
                    </span>
                  ) : null}
                  {/* {item?._source?.author ? (
                    <UserRoundPen
                      className={`w-4 h-4 ${
                        isSelected ? "text-[#C8C8C8]" : "text-[#666]"
                      }`}
                    />
                  ) : null} */}
                  {/* <span
                    className={`${
                      isSelected ? "text-[#C8C8C8]" : "text-[#666]"
                    } max-w-[180px] truncate text-right`}
                  >
                    {item?._source?.author || item?._source?.source?.name}
                  </span> */}

                  {isSelected ? (
                    <div
                      className={`absolute ${
                        showIndex && currentIndex < 10 ? "right-7" : "right-0"
                      } w-4 h-4 flex items-end justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
                        isSelected
                          ? "shadow-[-6px_0px_6px_2px_#950599]"
                          : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
                      }`}
                    >
                      ↩︎
                    </div>
                  ) : null}

                  {showIndex && currentIndex < 10 ? (
                    <div
                      className={`absolute right-0 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
                        isSelected
                          ? "shadow-[-6px_0px_6px_2px_#950599]"
                          : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
                      }`}
                    >
                      {currentIndex}
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
