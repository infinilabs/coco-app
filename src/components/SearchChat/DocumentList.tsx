import React, { useState, useRef, useEffect } from "react";
import { useInfiniteScroll } from "ahooks";
import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

import { useAppStore } from "@/stores/appStore";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useSearchStore } from "@/stores/searchStore";
import { SearchHeader } from "./SearchHeader";
import file_efault_img from "@/assets/images/file_efault.png";
import noDataImg from "@/assets/coconut-tree.png";
import { useConnectStore } from "@/stores/connectStore";

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
  const connector_data = useConnectStore((state) => state.connector_data);
  const datasourceData = useConnectStore((state) => state.datasourceData);

  const sourceData = useSearchStore((state) => state.sourceData);
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data, loading } = useInfiniteScroll(
    async (d) => {
      const page = d ? Math.ceil(d.list.length / PAGE_SIZE) + 1 : 1;

      const from = (page - 1) * PAGE_SIZE;

      let url = `/query/_search?query=${input}&datasource=${sourceData?._source?.source?.id}&from=${from}&size=${PAGE_SIZE}`;

      if (sourceData?._source?.rich_categories) {
        url = `/query/_search?query=${input}&rich_category=${sourceData?._source?.rich_categories[0]?.key}&from=${from}&size=${PAGE_SIZE}`;
      }

      try {
        const response = await tauriFetch({
          url,
          method: "GET",
        });

        const list = response.data?.hits?.hits || [];
        const total = response.data?.hits?.total?.value || 0;

        console.log("doc", url, response.data?.hits)

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
            const itemHeight = (parentRef.firstChild as HTMLElement)?.offsetHeight || 80;
            parentRef.scrollTo({
              top: (parentRef.lastChild as HTMLElement)?.offsetTop - itemHeight,
              behavior: 'instant',
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
      behavior: 'instant',
    });
  };

  function findConnectorIcon(item: any) {
    const id = item?._source?.source?.id || "";

    const result_source = datasourceData[endpoint_http]?.find(
      (data: any) => data._source.id === id
    );

    const connector_id = result_source?._source?.connector?.id;

    const result_connector = connector_data[endpoint_http]?.find(
      (data: any) => data._source.id === connector_id
    );

    return result_connector?._source;
  }

  function getIcon(item: any) {
    const connectorSource = findConnectorIcon(item);
    const icons = connectorSource?.assets?.icons || {};

    const selectedIcon = icons[item?._source?.icon];

    if (!selectedIcon) {
      return file_efault_img;
    }

    if (selectedIcon?.startsWith("http://") || selectedIcon?.startsWith("https://")) {
      return selectedIcon;
    } else {
      return endpoint_http + selectedIcon;
    }
  }

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
      if (item?._source?.url) {
        handleOpenURL(item?._source?.url);
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
              key={item._id + index}
              ref={(el) => (itemRefs.current[index] = el)}
              onMouseEnter={() => onMouseEnter(index, item)}
              onClick={() => {
                if (item?._source?.url) {
                  handleOpenURL(item?._source?.url);
                } 
              }}
              className={`w-full px-2 py-2.5 text-sm flex items-center gap-3 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? "text-white bg-[#950599] hover:bg-[#950599]"
                  : "text-[#333] dark:text-[#d8d8d8]"
              }`}
            >
              <div className="flex gap-2 items-center flex-1 min-w-0">
                <img
                  className="w-5 h-5 flex-shrink-0"
                  src={getIcon(item)}
                  alt="icon"
                />
                <span
                  className={`text-sm truncate ${
                    isSelected ? "font-medium" : ""
                  }`}
                >
                  {item?._source?.title}
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
