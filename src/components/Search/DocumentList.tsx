import React, { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteScroll } from "ahooks";
import { useTranslation } from "react-i18next";
import { FixedSizeList } from "react-window";

import { useSearchStore } from "@/stores/searchStore";
import { SearchHeader } from "./SearchHeader";
import noDataImg from "@/assets/coconut-tree.png";
import { metaOrCtrlKey } from "@/utils/keyboardUtils";
import SearchListItem from "./SearchListItem";
import { OpenURLWithBrowser } from "@/utils/index";

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
  getDocDetail: (detail: any) => void;
  input: string;
  isChatMode: boolean;
  selectedId?: string;
  viewMode: "detail" | "list";
  setViewMode: (mode: "detail" | "list") => void;
  queryDocuments: (
    from: number,
    size: number,
    queryStrings: any
  ) => Promise<any>;
}

const PAGE_SIZE = 20;
const ITEM_HEIGHT = 48; // SearchListItem height (padding + content)

export const DocumentList: React.FC<DocumentListProps> = ({
  input,
  getDocDetail,
  isChatMode,
  viewMode,
  setViewMode,
  queryDocuments,
}) => {
  const { t } = useTranslation();
  const sourceData = useSearchStore((state) => state.sourceData);

  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const listRef = useRef<FixedSizeList>(null);

  const { data, loading } = useInfiniteScroll(
    async (d) => {
      const from = d?.list?.length || 0;

      let queryStrings: any = {
        query: input,
        datasource: sourceData?.source?.id,
      };

      if (sourceData?.rich_categories) {
        queryStrings = {
          query: input,
          rich_category: sourceData?.rich_categories[0]?.key,
        };
      }

      try {
        const response = await queryDocuments(from, PAGE_SIZE, queryStrings);
        const list = response?.hits || [];
        const total = response?.total_hits || 0;

        // console.log("docs:", list, total);

        setTotal(total);

        return {
          list: list,
          hasMore: list.length === PAGE_SIZE,
        };
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        return {
          list: d?.list || [],
          hasMore: false,
        };
      }
    },
    {
      target: containerRef,
      isNoMore: (d) => !d?.hasMore,
      reloadDeps: [input, JSON.stringify(sourceData)],
      onFinally: (data) => onFinally(data, containerRef),
    }
  );

  const onFinally = (data: any, _ref: any) => {
    if (data?.page === 1) return;
    if (selectedItem === null) return;

    listRef.current?.scrollToItem(selectedItem, "smart");
  };

  const onMouseEnter = useCallback(
    (index: number, item: any) => {
      if (isKeyboardMode) return;
      getDocDetail(item);
      setSelectedItem(index);
    },
    [isKeyboardMode, getDocDetail]
  );

  useEffect(() => {
    setSelectedItem(null);
    setIsKeyboardMode(false);
  }, [isChatMode, input]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!data?.list?.length) return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsKeyboardMode(true);

        if (e.key === "ArrowUp") {
          setSelectedItem((prev) => {
            const newIndex = prev === null || prev === 0 ? 0 : prev - 1;
            getDocDetail(data.list[newIndex]?.document);
            listRef.current?.scrollToItem(newIndex, "smart");
            return newIndex;
          });
        } else {
          setSelectedItem((prev) => {
            const newIndex =
              prev === null
                ? 0
                : prev === data.list.length - 1
                ? prev
                : prev + 1;
            getDocDetail(data.list[newIndex]?.document);
            listRef.current?.scrollToItem(newIndex, "smart");
            return newIndex;
          });
        }
      } else if (e.key === metaOrCtrlKey()) {
        e.preventDefault();
      }

      if (e.key === "Enter" && selectedItem !== null) {
        const item = data?.list?.[selectedItem];
        if (item?.url) {
          OpenURLWithBrowser(item?.url);
        }
      }
    },
    [data, selectedItem, getDocDetail]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.movementX !== 0 || e.movementY !== 0) {
        setIsKeyboardMode(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (selectedItem !== null) {
      listRef.current?.scrollToItem(selectedItem, "smart");
    }
  }, [selectedItem]);

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const hit = data?.list[index];
      if (!hit) return null;

      const isSelected = selectedItem === index;
      const item = hit.document;

      return (
        <div style={style}>
          <SearchListItem
            key={item.id + index}
            itemRef={(el) => (itemRefs.current[index] = el)}
            item={item}
            isSelected={isSelected}
            currentIndex={index}
            onMouseEnter={() => onMouseEnter(index, item)}
            onItemClick={() => {
              if (item?.url) {
                OpenURLWithBrowser(item?.url);
              }
            }}
            showListRight={viewMode === "list"}
          />
        </div>
      );
    },
    [data, selectedItem, viewMode, onMouseEnter]
  );

  return (
    <div
      className={`border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-x-hidden ${
        viewMode === "list" ? "w-[100%]" : "w-[50%]"
      }`}
    >
      <div className="px-2 flex-shrink-0">
        <SearchHeader
          total={total}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {data?.list && data.list.length > 0 ? (
          <div ref={containerRef} style={{ height: "100%" }}>
            <FixedSizeList
              ref={listRef}
              height={containerRef.current?.clientHeight || 400}
              width="100%"
              itemCount={data?.list.length}
              itemSize={ITEM_HEIGHT}
              overscanCount={5}
              onScroll={({ scrollOffset, scrollUpdateWasRequested }) => {
                if (!scrollUpdateWasRequested && containerRef.current) {
                  const threshold = 100;
                  const { scrollHeight, clientHeight } = containerRef.current;
                  const remainingScroll =
                    scrollHeight - (scrollOffset + clientHeight);
                  if (
                    remainingScroll <= threshold &&
                    !loading &&
                    data?.hasMore
                  ) {
                    data?.loadMore && data.loadMore();
                  }
                }
              }}
            >
              {Row}
            </FixedSizeList>
          </div>
        ) : null}

        {loading && (
          <div className="flex justify-center py-4">
            <span>{t("search.list.loading")}</span>
          </div>
        )}

        {!loading && data?.list.length === 0 && (
          <div
            data-tauri-drag-region
            className="h-full w-full flex flex-col items-center"
          >
            <img
              src={noDataImg}
              alt={t("search.list.noDataAlt")}
              className="w-16 h-16 mt-24"
            />
            <div className="mt-4 text-sm text-[#999] dark:text-[#666]">
              {t("search.list.noResults")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
