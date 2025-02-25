import { useEffect, useRef, useState, useCallback } from "react";
import { CircleAlert, Bolt, X, ArrowBigRight } from "lucide-react";

import { useSearchStore } from "@/stores/searchStore";
import ThemedIcon from "@/components/Common/Icons/ThemedIcon";
import IconWrapper from "@/components/Common/Icons/IconWrapper";
import TypeIcon from "@/components/Common/Icons/TypeIcon";
import SearchListItem from "./SearchListItem";
import { metaOrCtrlKey, isMetaOrCtrlKey } from "@/utils/keyboardUtils";
import { OpenURLWithBrowser } from "@/utils/index";

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

  const setSourceData = useSearchStore(
    (state: { setSourceData: any }) => state.setSourceData
  );

  const [showError, setShowError] = useState<boolean>(IsError);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [showIndex, setShowIndex] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (isChatMode) {
      setSelectedItem(null);
    }
  }, [isChatMode]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // console.log(
      //   "handleKeyDown",
      //   e.key,
      //   showIndex,
      //   e.key >= "0" && e.key <= "9" && showIndex
      // );
      if (!suggests.length) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedItem((prev) => {
          const res =
            prev === null || prev === 0 ? suggests.length - 1 : prev - 1;

          return res;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedItem((prev) =>
          prev === null || prev === suggests.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === metaOrCtrlKey()) {
        e.preventDefault();
        if (selectedItem !== null) {
          const item = globalItemIndexMap[selectedItem];
          setSelectedName(item?.source?.name);
        }
        setShowIndex(true);
      }

      if (e.key === "ArrowRight" && selectedItem !== null) {
        e.preventDefault();
        const item = globalItemIndexMap[selectedItem];
        goToTwoPage(item);
      }

      if (e.key === "Enter" && selectedItem !== null) {
        // console.log("Enter key pressed", selectedItem);
        const item = globalItemIndexMap[selectedItem];
        if (item?.url) {
          OpenURLWithBrowser(item?.url);
        } else {
          selected(item);
        }
      }

      if (e.key >= "0" && e.key <= "9" && showIndex) {
        // console.log(`number ${e.key}`);
        const item = globalItemIndexMap[parseInt(e.key, 10)];
        if (item?.url) {
          OpenURLWithBrowser(item?.url);
        } else {
          selected(item);
        }
      }
    },
    [suggests, selectedItem, showIndex, selected, globalItemIndexMap]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // console.log("handleKeyUp", e.key);
    if (!suggests.length) return;

    if (!isMetaOrCtrlKey(e)) {
      setShowIndex(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (selectedItem !== null && itemRefs.current[selectedItem]) {
      itemRefs.current[selectedItem]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedItem]);

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
          {Object.entries(SearchData).length < 5 ? (
            <div className="p-2 text-xs text-[#999] dark:text-[#666] flex items-center gap-2.5 relative">
              <TypeIcon item={items[0]?.document} className="w-4 h-4" />
              {sourceName} - {items[0]?.source.name}
              <div className="flex-1 border-b border-b-[#e6e6e6] dark:border-b-[#272626]"></div>
              <IconWrapper
                className="w-4 h-4 cursor-pointer"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  goToTwoPage(items[0]?.document);
                }}
              >
                <ThemedIcon component={ArrowBigRight} className="w-4 h-4" />
              </IconWrapper>
              {showIndex && sourceName === selectedName ? (
                <div className={`bg-[#ccc] dark:bg-[#6B6B6B] `}>→</div>
              ) : null}
            </div>
          ) : null}
          {items.map((hit: any, index: number) => {
            const isSelected = selectedItem === globalIndex;
            const currentIndex = globalIndex;
            const item = hit.document;
            globalItemIndexMap.push(item);
            globalIndex++;
            return (
              <SearchListItem
                key={item.id + index}
                item={item}
                isSelected={isSelected}
                currentIndex={currentIndex}
                showIndex={showIndex}
                onMouseEnter={() => setSelectedItem(currentIndex)}
                onItemClick={() => {
                  if (item?.url) {
                    OpenURLWithBrowser(item?.url);
                  } else {
                    selected(item);
                  }
                }}
                goToTwoPage={goToTwoPage}
                itemRef={(el) => (itemRefs.current[currentIndex] = el)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default DropdownList;
