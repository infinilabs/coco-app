import React, { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteScroll } from "ahooks";
import { useTranslation } from "react-i18next";
import { Data } from "ahooks/lib/useInfiniteScroll/types";
import { nanoid } from "nanoid";
import { isNil } from "lodash-es";

import { useSearchStore } from "@/stores/searchStore";
import { SearchHeader } from "./SearchHeader";
import { metaOrCtrlKey } from "@/utils/keyboardUtils";
import SearchListItem from "./SearchListItem";
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import SearchEmpty from "../Common/SearchEmpty";
import Scrollbar from "@/components/Common/Scrollbar";
import dayjs from "dayjs";
import { updateAggregations } from "@/utils";

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
  getDocDetail: (detail: Record<string, any>) => void;
  input: string;
  isChatMode: boolean;
  selectedId?: string;
  viewMode: "detail" | "list";
  setViewMode: (mode: "detail" | "list") => void;
  formatUrl?: (item: any) => string;
}

const PAGE_SIZE = 20;

export const DocumentList: React.FC<DocumentListProps> = ({
  input,
  getDocDetail,
  isChatMode,
  viewMode,
  setViewMode,
  formatUrl,
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
  const taskIdRef = useRef(nanoid());
  const [data, setData] = useState<Data>({ list: [] });

  const loadingFromRef = useRef<number>(-1);

  const querySourceTimeoutRef = useRef(querySourceTimeout);

  const {
    aggregateFilter,
    filterDateRange,
    fuzziness,
    filterMultiSelectOpened,
  } = useSearchStore();

  useEffect(() => {
    querySourceTimeoutRef.current = querySourceTimeout;
  }, [querySourceTimeout]);

  const setSelectedSearchContent = useSearchStore((state) => {
    return state.setSelectedSearchContent;
  });

  useEffect(() => {
    if (isNil(selectedItem)) return;

    const hit = data.list[selectedItem];

    const item = { ...hit?.document, querySource: hit?.source };

    setSelectedSearchContent(item);
  }, [selectedItem, data]);

  const getData = async (taskId: string, data?: Data) => {
    const from = data?.list?.length || 0;

    const { fuzziness, aggregateFilter, filterDateRange } =
      useSearchStore.getState();

    let queryStrings: any = {
      query: input,
      datasource: sourceData?.source?.id,
      querysource: sourceData?.querySource?.id,
      fuzziness: String(fuzziness),
    };

    if (sourceData?.rich_categories) {
      queryStrings = {
        query: input,
        rich_category: sourceData?.rich_categories[0]?.key,
      };
    }

    if (sourceData?.main_extension_id) {
      queryStrings.main_extension_id = sourceData?.main_extension_id;
    }

    if (filterDateRange) {
      const { from, to } = filterDateRange;

      if (from) {
        queryStrings["update_time_start"] = dayjs(from).format("YYYY-MM-DD");
      }

      if (to) {
        queryStrings["update_time_end"] = dayjs(to).format("YYYY-MM-DD");
      }
    }

    if (aggregateFilter) {
      for (const [key, value] of Object.entries(aggregateFilter)) {
        if (value.length === 0) continue;

        const result = value.map((item) => item.key).join(",");

        queryStrings[key] = `any(${result})`;
      }
    }

    console.log("DocumentList queryStrings", queryStrings);

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

    const list = response?.hits ?? [];
    const allTotal = response?.total_hits ?? 0;
    // set first select hover
    if (from === 0 && list.length > 0) {
      setSelectedItem(0);
    }

    if (taskId === taskIdRef.current) {
      // Prevent the last data from being 0
      setTotal((prevTotal) => {
        if (list.length === 0) {
          return data?.list?.length === 0 ? 0 : prevTotal;
        }
        return allTotal;
      });
      setData((prev) => ({
        ...prev,
        list: prev.list.concat(list),
      }));
    }

    console.log("DocumentList response", response);

    updateAggregations(response);

    return {
      list: list,
      hasMore: list.length === PAGE_SIZE && from + list.length < allTotal,
    };
  };

  const { loading } = useInfiniteScroll(
    (data) => {
      const { filterMultiSelectOpened } = useSearchStore.getState();

      console.log("filterMultiSelectOpened", filterMultiSelectOpened);

      if (filterMultiSelectOpened) {
        return Promise.resolve({ list: data?.list ?? [], hasMore: false });
      }

      // Prevent repeated requests for the same from value
      const currentFrom = data?.list?.length || 0;

      // If it starts from 0, it means it is a new search, reset the anti-duplicate flag
      if (currentFrom === 0) {
        loadingFromRef.current = -1;
      }

      if (loadingFromRef.current === currentFrom) {
        return Promise.resolve({ list: [], hasMore: false });
      }

      loadingFromRef.current = currentFrom;

      const taskId = nanoid();
      taskIdRef.current = taskId;

      return getData(taskId, data).finally(() => {
        loadingFromRef.current = -1; // reset
      });
    },
    {
      target: containerRef,
      isNoMore: (d) => !d?.hasMore,
      reloadDeps: [
        input,
        JSON.stringify(sourceData),
        aggregateFilter,
        filterDateRange,
        fuzziness,
        filterMultiSelectOpened,
      ],
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
    (index: number) => {
      if (isKeyboardMode) return;
      setSelectedItem(index);
    },
    [isKeyboardMode]
  );

  useEffect(() => {
    setSelectedItem(null);
    setIsKeyboardMode(false);
  }, [isChatMode, input]);

  useEffect(() => {
    if (filterMultiSelectOpened) return;

    setTotal(0);
    setData((prev) => ({
      ...prev,
      list: [],
    }));
    loadingFromRef.current = -1;
  }, [
    input,
    JSON.stringify(sourceData),
    aggregateFilter,
    filterDateRange,
    fuzziness,
    filterMultiSelectOpened,
  ]);

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

        platformAdapter.openSearchItem(item, formatUrl);
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

  useEffect(() => {
    if (selectedItem === null) return;
    const doc = data.list[selectedItem]?.document;
    if (doc) {
      getDocDetail(doc);
    }
  }, [selectedItem, data, getDocDetail]);

  return (
    <div
      className={`border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-x-hidden ${
        viewMode === "list" ? "w-full" : "w-[50%]"
      }`}
    >
      <div className="px-2 shrink-0">
        <SearchHeader
          total={total}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>

      <Scrollbar className="flex-1 overflow-auto pr-0.5" ref={containerRef}>
        {data?.list && data.list.length > 0 && (
          <div>
            {data.list.map((hit, index) => (
              <SearchListItem
                key={hit.document.id + index}
                itemRef={(el) => (itemRefs.current[index] = el)}
                item={{ ...hit.document, querySource: hit.source }}
                isSelected={selectedItem === index}
                currentIndex={index}
                onMouseEnter={() => onMouseEnter(index)}
                onItemClick={() => {
                  platformAdapter.openSearchItem(hit.document, formatUrl);
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
      </Scrollbar>
    </div>
  );
};
