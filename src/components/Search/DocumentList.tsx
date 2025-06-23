import React, { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteScroll } from "ahooks";
import { useTranslation } from "react-i18next";

import { useSearchStore } from "@/stores/searchStore";
import { SearchHeader } from "./SearchHeader";
import { metaOrCtrlKey } from "@/utils/keyboardUtils";
import SearchListItem from "./SearchListItem";
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import SearchEmpty from "../Common/SearchEmpty";

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
  getDocDetail: (detail: Record<string, any>) => void;
  input: string;
  isChatMode: boolean;
  selectedId?: string;
  viewMode: "detail" | "list";
  setViewMode: (mode: "detail" | "list") => void;
}

const PAGE_SIZE = 20;

export const DocumentList: React.FC<DocumentListProps> = ({
  input,
  getDocDetail,
  isChatMode,
  viewMode,
  setViewMode,
}) => {
  const { t } = useTranslation();
  const sourceData = useSearchStore((state) => state.sourceData);
  const isTauri = useAppStore((state) => state.isTauri);
  const querySourceTimeout = useConnectStore((state) => {
    return state.querySourceTimeout;
  });

  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  const querySourceTimeoutRef = useRef(querySourceTimeout);
  useEffect(() => {
    querySourceTimeoutRef.current = querySourceTimeout;
  }, [querySourceTimeout]);

  const { data, loading } = useInfiniteScroll(
    async (d) => {
      const from = d?.list?.length || 0;
      let queryStrings: any = {
        query: input,
        datasource: sourceData?.source?.id,
        querysource: sourceData?.querySource?.id,
      };

      if (sourceData?.rich_categories) {
        queryStrings = {
          query: input,
          rich_category: sourceData?.rich_categories[0]?.key,
        };
      }

      let response: any;
      if (isTauri) {
        response = await platformAdapter.commands("query_coco_fusion", {
          from: from,
          size: PAGE_SIZE,
          queryStrings: queryStrings,
          queryTimeout: querySourceTimeoutRef.current,
        });
      } else {
        let url = `/query/_search?query=${queryStrings.query}&datasource=${queryStrings.datasource}&from=${from}&size=${PAGE_SIZE}`;
        if (queryStrings?.rich_categories) {
          url = `/query/_search?query=${queryStrings.query}&rich_category=${queryStrings.rich_category}&from=${from}&size=${PAGE_SIZE}`;
        }
        const [error, res]: any = await Get(url);

        if (error) {
          console.error("_search", error);
          response = { hits: [], total: 0 };
        } else {
          const hits =
            res?.hits?.hits?.map((hit: any) => ({
              document: {
                ...hit._source,
              },
              score: hit._score || 0,
              source: hit._source.source || null,
            })) || [];
          const total = res?.hits?.total?.value || 0;

          response = {
            hits: hits,
            total_hits: total,
          };
        }
      }
      console.log("_docs", from, queryStrings, response);
      const list = response?.hits || [];
      const total = response?.total_hits || 0;
      setTotal(total);

      return {
        list: list,
        hasMore: list.length === PAGE_SIZE && from + list.length < total,
      };
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

  const { visibleContextMenu } = useSearchStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!data?.list?.length) return;

      const handleArrowKeys = () => {
        if (visibleContextMenu) return;

        e.preventDefault();
        setIsKeyboardMode(true);

        setSelectedItem((prev) => {
          const isArrowUp = e.key === "ArrowUp";
          const nextIndex =
            prev === null
              ? 0
              : isArrowUp
              ? Math.max(0, prev - 1)
              : Math.min(data.list.length - 1, prev + 1);

          getDocDetail(data.list[nextIndex]?.document);
          itemRefs.current[nextIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
          return nextIndex;
        });
      };

      const handleEnter = () => {
        if (selectedItem === null) return;
        const item = data.list[selectedItem]?.document;

        platformAdapter.openSearchItem(item);
      };

      switch (e.key) {
        case "ArrowUp":
        case "ArrowDown":
          handleArrowKeys();
          break;
        case metaOrCtrlKey():
          e.preventDefault();
          break;
        case "Enter":
          handleEnter();
          break;
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

      <div
        className="flex-1 overflow-auto custom-scrollbar pr-0.5"
        ref={containerRef}
      >
        {data?.list && data.list.length > 0 && (
          <div>
            {data.list.map((hit, index) => (
              <SearchListItem
                key={hit.document.id + index}
                itemRef={(el) => (itemRefs.current[index] = el)}
                item={{ ...hit.document, querySource: hit.source }}
                isSelected={selectedItem === index}
                currentIndex={index}
                onMouseEnter={() => onMouseEnter(index, hit.document)}
                onItemClick={() => {
                  platformAdapter.openSearchItem(hit.document);
                }}
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
            className="h-full w-full flex flex-col justify-center items-center"
          >
            <SearchEmpty />
          </div>
        )}
      </div>
    </div>
  );
};
