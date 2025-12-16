import {
  useEffect,
  useRef,
  useState,
  useCallback,
  MouseEvent,
  useMemo,
} from "react";
import { useDebounceFn } from "ahooks";
import { useTranslation } from "react-i18next";

import { useSearchStore } from "@/stores/searchStore";
import ErrorSearch from "@/components/Common/ErrorNotification/ErrorSearch";
import type { QueryHits, SearchDocument, FailedRequest } from "@/types/search";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { SearchSource } from "./SearchSource";
import DropdownListItem from "./DropdownListItem";
import platformAdapter from "@/utils/platformAdapter";
import Scrollbar from "@/components/Common/Scrollbar";

type ISearchData = Record<string, QueryHits[]>;

interface DropdownListProps {
  suggests: QueryHits[];
  searchData: ISearchData;
  isError: FailedRequest[];
  isSearchComplete: boolean;
  isChatMode: boolean;
  globalItemIndexMap: Record<number, SearchDocument>;
  formatUrl?: (item: any) => string;
}

function DropdownList({
  suggests,
  searchData,
  isError,
  isChatMode,
  globalItemIndexMap,
  formatUrl,
}: DropdownListProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [showIndex, setShowIndex] = useState<boolean>(false);

  const { setSourceData, setSelectedSearchContent, setVisibleContextMenu } =
    useSearchStore();

  const showSource = useMemo(
    () => Object.keys(searchData).length < 5,
    [searchData]
  );

  const handleItemAction = useCallback((item: SearchDocument) => {
    if (
      !item ||
      item.category === "Calculator" ||
      item.category === "AI Overview"
    ) {
      return;
    }

    setSourceData(item);
  }, []);

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();

    setVisibleContextMenu(true);
  };

  const memoizedCallbacks = useMemo(() => {
    return {
      onMouseEnter: (index: number, item: SearchDocument) => {
        setVisibleContextMenu(false);
        setSelectedIndex(index);
        setSelectedSearchContent(item);
      },
      onItemClick: (item: SearchDocument) => {
        console.log(11111, item, formatUrl);
        platformAdapter.openSearchItem(item, formatUrl);
      },
      goToTwoPage: (item: SearchDocument) => {
        setSourceData(item);
      },
    };
  }, []);

  useEffect(() => {
    if (selectedIndex === null) {
      setSelectedSearchContent(undefined);
      return;
    }

    const item = globalItemIndexMap[selectedIndex];
    setSelectedSearchContent(item);
  }, [selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex !== null && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (isChatMode) {
      setSelectedIndex(null);
    }
  }, [isChatMode]);

  const { run: initializeSelection } = useDebounceFn(
    () => {
      setSelectedIndex(0);
      setSelectedSearchContent(suggests[0]?.document || null);
    },
    { wait: 200 }
  );

  useEffect(() => {
    setSelectedIndex(null);
    initializeSelection();
  }, [searchData]);

  useEffect(() => {
    return () => {
      setSelectedIndex(null);
      setSelectedSearchContent(undefined);
    };
  }, []);

  // Keyboard navigation
  useKeyboardNavigation({
    suggests,
    selectedIndex,
    setSelectedIndex,
    showIndex,
    setShowIndex,
    setSelectedName,
    globalItemIndexMap,
    handleItemAction,
    isChatMode,
    formatUrl,
    searchData,
  });

  return (
    <Scrollbar
      ref={containerRef}
      data-tauri-drag-region
      className="h-full w-full p-2 flex flex-col overflow-y-auto focus:outline-none"
      tabIndex={0}
      role="listbox"
      aria-label={t("search.header.results")}
    >
      <ErrorSearch isError={isError} />

      {Object.entries(searchData).map(([sourceName, items]) => (
        <div key={sourceName}>
          {showSource && items[0].document.category !== "AI Overview" && (
            <SearchSource
              sourceName={sourceName}
              items={items}
              selectedName={selectedName}
              showIndex={showIndex}
              onGoToTwoPage={() => handleItemAction(items[0]?.document)}
            />
          )}

          {items.map((hit, idx) => {
            const currentIndex = hit.document.index ?? 0;
            const itemKey = `${sourceName}-${hit.document.id ?? currentIndex}-${idx}`;

            return (
              <DropdownListItem
                key={itemKey}
                item={hit.document}
                selectedIndex={selectedIndex}
                currentIndex={currentIndex}
                showIndex={showIndex}
                memoizedCallbacks={memoizedCallbacks}
                itemRefs={itemRefs}
                onContextMenu={handleContextMenu}
              />
            );
          })}
        </div>
      ))}
    </Scrollbar>
  );
}

export default DropdownList;
