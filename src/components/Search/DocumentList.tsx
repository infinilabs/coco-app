import React, { useState, useRef, useEffect } from "react";
import { useInfiniteScroll } from "ahooks";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

import { useSearchStore } from "@/stores/searchStore";
import { SearchHeader } from "./SearchHeader";
import noDataImg from "@/assets/coconut-tree.png";
import ItemIcon from "@/components/Common/Icons/ItemIcon";

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

  const { data, loading } = useInfiniteScroll(
    async (d) => {
      const from = d?.list.length || 0;

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
        const response: any = await invoke("query_coco_servers", {
          from: from,
          size: PAGE_SIZE,
          queryStrings,
        });
        const list = response?.documents || [];
        const total = response?.total_hits || 0;

        console.log("doc", response?.documents);

        setTotal(total);

        getDocDetail(list[0] || {});

        return {
          list,
          hasMore: from + list.length < total,
        };
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        return {
          list: [],
          hasMore: false,
        };
      }
    },
    {
      target: containerRef,
      isNoMore: (d) => (d?.list.length || 0) >= total,
      reloadDeps: [input, JSON.stringify(sourceData)],
      onBefore: () => {
        setTimeout(() => {
          const parentRef = containerRef.current;
          if (parentRef && parentRef.childElementCount > 10) {
            const itemHeight =
              (parentRef.firstChild as HTMLElement)?.offsetHeight || 80;
            parentRef.scrollTo({
              top: (parentRef.lastChild as HTMLElement)?.offsetTop - itemHeight,
              behavior: "instant",
            });
          }
        });
      },
      onFinally: (data) => onFinally(data, containerRef),
    }
  );

  const onFinally = (data: any, ref: any) => {
    if (data?.page === 1) return;
    const parentRef = ref.current;
    if (!parentRef) return;
    const itemHeight = parentRef.firstChild?.offsetHeight || 80;
    parentRef.scrollTo({
      top:
        parentRef.lastChild?.offsetTop - (data?.list?.length + 1) * itemHeight,
      behavior: "instant",
    });
  };

  function onMouseEnter(index: number, item: any) {
    getDocDetail(item);
    setSelectedItem(index);
  }

  useEffect(() => {
    setSelectedItem(null);
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!data?.list?.length) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedItem((prev) => (prev === null || prev === 0 ? 0 : prev - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedItem((prev) =>
        prev === null ? 0 : prev === data?.list?.length - 1 ? prev : prev + 1
      );
    } else if (e.key === "Meta") {
      e.preventDefault();
    }

    if (e.key === "Enter" && selectedItem !== null) {
      const item = data?.list?.[selectedItem];
      if (item?.url) {
        handleOpenURL(item?.url);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem]);

  useEffect(() => {
    if (selectedItem !== null && itemRefs.current[selectedItem]) {
      itemRefs.current[selectedItem]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
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
        {data?.list.map((item: any, index: number) => {
          const isSelected = selectedItem === index;
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
                <span
                  className={`text-sm truncate`}
                >
                  {item?.title}
                </span>
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
