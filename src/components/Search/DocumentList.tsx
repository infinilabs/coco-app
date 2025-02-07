import React, { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteScroll } from "ahooks";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

import { useSearchStore } from "@/stores/searchStore";
import { SearchHeader } from "./SearchHeader";
import noDataImg from "@/assets/coconut-tree.png";
import ItemIcon from "@/components/Common/Icons/ItemIcon";
import { metaOrCtrlKey } from "@/utils/keyboardUtils";

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
  getDocDetail: (detail: any) => void;
  input: string;
  isChatMode: boolean;
  selectedId?: string;
}

const PAGE_SIZE = 20;

export const DocumentList: React.FC<DocumentListProps> = ({
  input,
  getDocDetail,
  isChatMode,
}) => {
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
        const response: any = await invoke("query_coco_fusion", {
          from: from,
          size: PAGE_SIZE,
          queryStrings,
        });
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

  const onFinally = (data: any, ref: any) => {
    if (data?.page === 1) return;
    const parentRef = ref.current;
    if (!parentRef || selectedItem === null) return;

    const targetElement = itemRefs.current[selectedItem];
    if (!targetElement) return;

    requestAnimationFrame(() => {
      targetElement.scrollIntoView({
        behavior: "instant",
        block: "nearest",
      });
    });
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
            return newIndex;
          });
        }
      } else if (e.key === metaOrCtrlKey()) {
        e.preventDefault();
      }

      if (e.key === "Enter" && selectedItem !== null) {
        const item = data?.list?.[selectedItem];
        if (item?.url) {
          handleOpenURL(item?.url);
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
    if (selectedItem !== null && itemRefs.current[selectedItem]) {
      requestAnimationFrame(() => {
        itemRefs.current[selectedItem]?.scrollIntoView({
          behavior: "instant",
          block: "nearest",
        });
      });
    }
  }, [selectedItem]);

  return (
    <div className="w-[50%] border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="px-2 flex-shrink-0">
        <SearchHeader total={total} />
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        {data?.list.map((hit: any, index: number) => {
          const isSelected = selectedItem === index;
          const item = hit.document;
          return (
            <div
              key={item.id + index}
              ref={(el) => (itemRefs.current[index] = el)}
              onMouseEnter={() => onMouseEnter(index, item)}
              onClick={() => {
                if (item?.url) {
                  handleOpenURL(item?.url);
                }
              }}
              className={`w-full px-2 py-2.5 text-sm flex items-center gap-3 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? "text-white bg-[#950599] hover:bg-[#950599]"
                  : "text-[#333] dark:text-[#d8d8d8]"
              }`}
            >
              <div className="flex gap-2 items-center flex-1 min-w-0">
                <ItemIcon item={item} />
                <span className={`text-sm truncate`}>{item?.title}</span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-center py-4">
            <span>Loading...</span>
          </div>
        )}

        {!loading && data?.list.length === 0 && (
          <div
            data-tauri-drag-region
            className="h-full w-full flex flex-col items-center"
          >
            <img src={noDataImg} alt="no-data" className="w-16 h-16 mt-24" />
            <div className="mt-4 text-sm text-[#999] dark:text-[#666]">
              No Results
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
