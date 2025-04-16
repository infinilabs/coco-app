import React, { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteScroll } from "ahooks";
import { useTranslation } from "react-i18next";

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
        setTotal(total);

        return {
          list: list,
          hasMore: list.length === PAGE_SIZE && from + list.length < total,
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
      reloadDeps: [input?.trim(), JSON.stringify(sourceData)],
      onFinally: (data) => {
        if (data?.page === 1) return;
        if (selectedItem === null) return;
        setSelectedItem(null);
        itemRefs.current[selectedItem]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      },
    }
  );

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

        const newIndex =
          e.key === "ArrowUp"
            ? (prev: number | null) =>
                prev === null || prev === 0 ? 0 : prev - 1
            : (prev: number | null) =>
                prev === null
                  ? 0
                  : prev === data.list.length - 1
                  ? prev
                  : prev + 1;

        setSelectedItem((prev) => {
          const nextIndex = newIndex(prev);
          getDocDetail(data.list[nextIndex]?.document);
          itemRefs.current[nextIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
          return nextIndex;
        });
      } else if (e.key === metaOrCtrlKey()) {
        e.preventDefault();
      } else if (e.key === "Enter" && selectedItem !== null) {
        const item = data?.list?.[selectedItem];
        item?.document?.url && OpenURLWithBrowser(item.document.url);
      }
    },
    [data, selectedItem, getDocDetail]
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.movementX !== 0 || e.movementY !== 0) {
      setIsKeyboardMode(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, handleMouseMove]);

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

      <div className="flex-1 overflow-auto" ref={containerRef}>
        {data?.list && data.list.length > 0 && (
          <div>
            {data.list.map((hit, index) => (
              <SearchListItem
                key={hit.document.id + index}
                itemRef={(el) => (itemRefs.current[index] = el)}
                item={hit.document}
                isSelected={selectedItem === index}
                currentIndex={index}
                onMouseEnter={() => onMouseEnter(index, hit.document)}
                onItemClick={() =>
                  hit.document?.url && OpenURLWithBrowser(hit.document.url)
                }
                showListRight={viewMode === "list"}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <span>{t("search.list.loading")}</span>
          </div>
        )}

        {!loading && (!data?.list || data.list.length === 0) && (
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
