import {
  useEffect,
  useRef,
  useState,
  useCallback,
  MouseEvent,
  useMemo,
} from "react";
import { useDebounceFn, useUnmount } from "ahooks";
import { useTranslation } from "react-i18next";

import { useSearchStore } from "@/stores/searchStore";
import { OpenURLWithBrowser } from "@/utils/index";
import ErrorSearch from "@/components/Common/ErrorNotification/ErrorSearch";
import type { QueryHits, Document, FailedRequest } from "@/types/search";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { SearchSource } from "./SearchSource";
import DropdownListItem from "./DropdownListItem";

type ISearchData = Record<string, QueryHits[]>;

interface DropdownListProps {
  suggests: QueryHits[];
  searchData: ISearchData;
  isError: FailedRequest[];
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
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedName, setSelectedName] = useState<string>("");
  const [showIndex, setShowIndex] = useState<boolean>(false);

  const {
    setSourceData,
    setSelectedSearchContent,
    setSelectedAssistant,
    setVisibleContextMenu,
  } = useSearchStore();

  const { globalItemIndexMap, globalIndex } = useMemo(() => {
    const map = Object.values(searchData)
      .flat()
      .map((hit) => hit.document);

    return {
      globalItemIndexMap: map,
      globalIndex: map.length,
    };
  }, [searchData]);

  const showSource = useMemo(
    () => Object.keys(searchData).length < 5,
    [searchData]
  );

  const handleItemAction = useCallback((item: Document) => {
    if (!item || item.category === "Calculator") return;
    setSourceData(item);
  }, []);

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();

    setVisibleContextMenu(true);
  };

  const memoizedCallbacks = useMemo(() => {
    return {
      onMouseEnter: (index: number) => () => setSelectedIndex(index),
      onItemClick: (item: Document) => () => {
        if (item?.url) {
          OpenURLWithBrowser(item.url);
        }
      },
      goToTwoPage: (item: Document) => () => setSourceData(item),
    };
  }, []);

  useUnmount(() => {
    setSelectedIndex(-1);
    setSelectedSearchContent(undefined);
  });

  useEffect(() => {
    if (selectedIndex === -1) {
      setSelectedSearchContent(undefined);
      return;
    }
    const selectedItem = globalItemIndexMap[selectedIndex];
    setSelectedSearchContent(selectedItem);

    if (selectedItem?.source?.id === "assistant") {
      setSelectedAssistant({
        ...selectedItem,
        name: selectedItem.title,
      });
    } else {
      setSelectedAssistant(undefined);
    }
  }, [selectedIndex, globalItemIndexMap]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex !== -1 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (isChatMode) {
      setSelectedIndex(-1);
    }
  }, [isChatMode]);

  const { run: initializeSelection } = useDebounceFn(
    () => setSelectedIndex(0),
    { wait: 200 }
  );

  useEffect(() => {
    setSelectedIndex(-1);
    initializeSelection();
  }, [searchData]);

  // Keyboard navigation
  useKeyboardNavigation({
    suggests,
    selectedIndex,
    setSelectedIndex,
    showIndex,
    setShowIndex,
    setSelectedName,
    globalItemIndexMap,
    openPopover: false,
    handleItemAction,
    isChatMode,
  });

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

      {Object.entries(searchData).map(([sourceName, items]) => (
        <div key={sourceName}>
          {showSource && (
            <SearchSource
              sourceName={sourceName}
              items={items}
              selectedName={selectedName}
              showIndex={showIndex}
              onGoToTwoPage={() => handleItemAction(items[0]?.document)}
            />
          )}

          {items.map((hit) => (
            <DropdownListItem
              key={hit.document.id}
              item={hit.document}
              isSelected={selectedIndex === globalIndex}
              currentIndex={globalIndex}
              showIndex={showIndex}
              memoizedCallbacks={memoizedCallbacks}
              itemRefs={itemRefs}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default DropdownList;
