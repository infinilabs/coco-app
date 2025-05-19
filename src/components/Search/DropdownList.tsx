import {
  useEffect,
  useRef,
  useState,
  useCallback,
  MouseEvent,
  useMemo,
} from "react";
import { ArrowBigRight, FolderOpen } from "lucide-react";
import { isNil } from "lodash-es";
import { useDebounceFn, useUnmount } from "ahooks";
import { useTranslation } from "react-i18next";

import { useSearchStore } from "@/stores/searchStore";
import ThemedIcon from "@/components/Common/Icons/ThemedIcon";
import IconWrapper from "@/components/Common/Icons/IconWrapper";
import CommonIcon from "@/components/Common/Icons/CommonIcon";
import SearchListItem from "./SearchListItem";
import { metaOrCtrlKey, isMetaOrCtrlKey } from "@/utils/keyboardUtils";
import { copyToClipboard, OpenURLWithBrowser } from "@/utils/index";
import VisibleKey from "@/components/Common/VisibleKey";
import Calculator from "./Calculator";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import ErrorSearch from "@/components/Common/ErrorNotification/ErrorSearch";
// import AiSummary from "./AiSummary";
import clsx from "clsx";

type ISearchData = Record<string, any[]>;

interface DropdownListProps {
  suggests: any[];
  searchData: ISearchData;
  isError: any[];
  isSearchComplete: boolean;
  isChatMode: boolean;
}

function DropdownList({
  suggests,
  searchData,
  isError,
  isChatMode,
}: DropdownListProps) {
  const { t } = useTranslation();

  let globalIndex = 0;
  const globalItemIndexMap: any[] = [];

  const setSourceData = useSearchStore((state) => state.setSourceData);

  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [showIndex, setShowIndex] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setSelectedSearchContent = useSearchStore(
    (state) => state.setSelectedSearchContent
  );

  const hideArrowRight = (item: any) => {
    const categories = ["Calculator"];

    return categories.includes(item.category);
  };

  useUnmount(() => {
    setSelectedItem(null);
    setSelectedSearchContent(void 0);
  });

  useEffect(() => {
    if (isNil(selectedItem)) {
      setSelectedSearchContent(void 0);

      return;
    }

    setSelectedSearchContent(globalItemIndexMap[selectedItem]);
  }, [selectedItem]);

  useEffect(() => {
    if (isChatMode) {
      setSelectedItem(null);
    }
  }, [isChatMode]);

  const { run } = useDebounceFn(() => setSelectedItem(0), { wait: 200 });

  useEffect(() => {
    setSelectedItem(null);

    run();
  }, [searchData]);

  const openPopover = useShortcutsStore((state) => state.openPopover);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!suggests.length || openPopover) return;

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

        if (hideArrowRight(item)) return;

        goToTwoPage(item);
      }

      if (e.key === "Enter" && !e.shiftKey && selectedItem !== null) {
        // console.log("Enter key pressed", selectedItem);
        const item = globalItemIndexMap[selectedItem];
        if (item?.url) {
          OpenURLWithBrowser(item?.url);
        } else {
          copyToClipboard(item?.payload?.result?.value);
        }
      }

      if (e.key >= "0" && e.key <= "9" && showIndex) {
        let index = parseInt(e.key, 10);

        index = index === 0 ? 9 : index - 1;

        const item = globalItemIndexMap[index];

        if (item?.url) {
          OpenURLWithBrowser(item?.url);
        }
      }
    },
    [suggests, selectedItem, showIndex, globalItemIndexMap, openPopover]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // console.log("handleKeyUp", e.key);
    if (!suggests.length) return;

    if (!isMetaOrCtrlKey(e)) {
      setShowIndex(false);
    }
  }, []);

  useEffect(() => {
    if (isChatMode) return;

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
  }

  const setVisibleContextMenu = useSearchStore(
    (state) => state.setVisibleContextMenu
  );

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();

    setVisibleContextMenu(true);
  };

  const memoizedCallbacks = useMemo(() => {
    return {
      onMouseEnter: (index: number) => () => setSelectedItem(index),
      onItemClick: (item: any) => () => {
        if (item?.url) {
          OpenURLWithBrowser(item.url);
        }
      },
      goToTwoPage: (item: any) => () => setSourceData(item),
    };
  }, []);

  const showHeader = useMemo(
    () => Object.entries(searchData).length < 5,
    [searchData]
  );

  return (
    <div
      ref={containerRef}
      data-tauri-drag-region
      className="h-full w-full p-2 flex flex-col overflow-y-auto custom-scrollbar focus:outline-none"
      tabIndex={0}
      role="listbox"
      aria-label={t("search.header.results")}
    >
      <ErrorSearch isError={isError} />

      {Object.entries(searchData).map(([sourceName, items]) => {
        return (
          <div key={sourceName}>
            {showHeader && (
              <div className="p-2 text-xs text-[#999] dark:text-[#666] flex items-center gap-2.5 relative">
                <CommonIcon
                  item={items[0]?.document}
                  renderOrder={["connector_icon", "default_icon"]}
                  itemIcon={items[0]?.document?.source?.icon}
                  defaultIcon={FolderOpen}
                  className="w-4 h-4"
                />
                {sourceName} - {items[0]?.source.name}
                <div className="flex-1 border-b border-b-[#e6e6e6] dark:border-b-[#272626]"></div>
                {!hideArrowRight({ category: sourceName }) && (
                  <>
                    <IconWrapper
                      className="w-4 h-4 cursor-pointer"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        goToTwoPage(items[0]?.document);
                      }}
                    >
                      <ThemedIcon
                        component={ArrowBigRight}
                        className="w-4 h-4"
                      />
                    </IconWrapper>
                    {showIndex && sourceName === selectedName && (
                      <div className="absolute top-1 right-4">
                        <VisibleKey shortcut="→" />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {items.map((hit: any) => {
              const isSelected = selectedItem === globalIndex;
              const currentIndex = globalIndex;
              const item = hit.document;
              globalItemIndexMap.push(item);
              globalIndex++;

              return (
                <div key={item.id} onContextMenu={handleContextMenu}>
                  {hideArrowRight(item) ? (
                    <div
                      ref={(el) => (itemRefs.current[currentIndex] = el)}
                      onMouseEnter={memoizedCallbacks.onMouseEnter(
                        currentIndex
                      )}
                      role="option"
                      aria-selected={isSelected}
                      id={`search-item-${currentIndex}`}
                      className={clsx("p-2 transition rounded-lg", {
                        "bg-[#EDEDED] dark:bg-[#202126]": isSelected,
                      })}
                    >
                      <Calculator item={item} isSelected={isSelected} />
                    </div>
                  ) : (
                    <SearchListItem
                      item={item}
                      isSelected={isSelected}
                      currentIndex={currentIndex}
                      showIndex={showIndex}
                      onMouseEnter={memoizedCallbacks.onMouseEnter(
                        currentIndex
                      )}
                      onItemClick={() => {
                        if (item?.url) {
                          OpenURLWithBrowser(item?.url);
                        }
                      }}
                      goToTwoPage={() => goToTwoPage(item)}
                      itemRef={(el) => (itemRefs.current[currentIndex] = el)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default DropdownList;
