import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDownIcon, RefreshCw, Layers, Hammer } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useDebounce } from "ahooks";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import CommonIcon from "@/components/Common/Icons/CommonIcon";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import { DataSource } from "@/types/commands";
import Checkbox from "@/components/Common/Checkbox";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import VisibleKey from "@/components/Common/VisibleKey";
import NoDataImage from "@/components/Common/NoDataImage";
import PopoverInput from "@/components/Common/PopoverInput";
import Pagination from "@/components/Common/Pagination";
import { SearchQuery } from "@/utils";

interface MCPPopoverProps {
  mcp_servers: any;
  isMCPActive: boolean;
  setIsMCPActive: () => void;
  getMCPByServer: (
    serverId: string,
    searchQuery?: SearchQuery
  ) => Promise<DataSource[]>;
}

export default function MCPPopover({
  mcp_servers,
  isMCPActive,
  setIsMCPActive,
  getMCPByServer,
}: MCPPopoverProps) {
  const { t } = useTranslation();

  const [isRefreshDataSource, setIsRefreshDataSource] = useState(false);
  const [dataList, setDataList] = useState<DataSource[]>([]);

  const MCPIds = useSearchStore((state) => state.MCPIds);
  const setMCPIds = useSearchStore((state) => state.setMCPIds);

  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const currentService = useConnectStore((state) => state.currentService);

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, { wait: 500 });

  const getDataSourceList = useCallback(async () => {
    try {
      setPage(1);

      const res: DataSource[] = await getMCPByServer(currentService?.id, {
        query: debouncedKeyword,
      });

      // console.log("getMCPByServer", res);

      if (res?.length === 0) {
        setDataList([]);
        return;
      }
      const data = res?.length
        ? [
            {
              id: "all",
              name: "search.input.searchPopover.allScope",
            },
            ...res,
          ]
        : [];

      setDataList(data);
    } catch (err) {
      setDataList([]);
      console.error("datasource_search", err);
    }
  }, [currentService?.id, debouncedKeyword, getMCPByServer]);

  const popoverButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const mcpSearch = useShortcutsStore((state) => state.mcpSearch);
  const mcpSearchScope = useShortcutsStore((state) => {
    return state.mcpSearchScope;
  });
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [visibleList, setVisibleList] = useState<DataSource[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dataList.length > 0) {
      setMCPIds(dataList.slice(1).map((item) => item.id));
    }
  }, [dataList]);

  useEffect(() => {
    getDataSourceList();
  }, [currentService?.id, debouncedKeyword, currentAssistant]);

  useEffect(() => {
    setTotalPage(Math.max(Math.ceil(dataList.length / 10), 1));
  }, [dataList]);

  useEffect(() => {
    if (dataList.length === 0) {
      return setVisibleList([]);
    }

    const startIndex = (page - 1) * 9;
    const endIndex = startIndex + 9;

    const list = [
      dataList[0],
      ...dataList.slice(1).slice(startIndex, endIndex),
    ];

    setVisibleList(list);
  }, [dataList, page]);

  const onSelectDataSource = useCallback(
    (id: string, checked: boolean, isAll: boolean) => {
      let nextSourceDataIds = new Set(MCPIds);

      const ids = isAll ? visibleList.slice(1).map((item) => item.id) : [id];

      for (const id of ids) {
        if (checked) {
          nextSourceDataIds.add(id);
        } else {
          nextSourceDataIds.delete(id);
        }
      }

      setMCPIds(Array.from(nextSourceDataIds));
    },
    [visibleList, MCPIds]
  );

  const handleRefresh = async () => {
    setIsRefreshDataSource(true);

    await getDataSourceList();

    setTimeout(() => {
      setIsRefreshDataSource(false);
    }, 1000);
  };

  const handlePrev = () => {
    if (page === 1) return;

    setPage(page - 1);
  };

  const handleNext = () => {
    if (page === totalPage) return;

    setPage(page + 1);
  };

  if (!(mcp_servers?.enabled && mcp_servers?.visible)) {
    return null;
  }

  return (
    <div
      className={clsx(
        "flex justify-center items-center gap-1 h-[20px] px-1 rounded-[6px] transition cursor-pointer hover:bg-[#EDEDED] dark:hover:bg-[#202126]",
        {
          "bg-[rgba(0,114,255,0.3)]!": isMCPActive,
        }
      )}
      onClick={setIsMCPActive}
    >
      <VisibleKey shortcut={mcpSearch} onKeyPress={setIsMCPActive}>
        <Hammer
          className={`size-3 ${
            isMCPActive
              ? "text-[#0072FF] dark:text-[#0072FF]"
              : "text-[#333] dark:text-white"
          }`}
        />
      </VisibleKey>

      {isMCPActive && (
        <>
          <span
            className={`${isMCPActive ? "text-[#0072FF]" : "dark:text-white"}`}
          >
            {t("search.input.MCP")}
          </span>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              ref={popoverButtonRef}
              className="flex items-center"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <VisibleKey
                shortcut={mcpSearchScope}
                onKeyPress={() => {
                  popoverButtonRef.current?.click();
                }}
              >
                <ChevronDownIcon
                  className={clsx("size-3 cursor-pointer", [
                    isMCPActive
                      ? "text-[#0072FF] dark:text-[#0072FF]"
                      : "text-[#333] dark:text-white",
                  ])}
                />
              </VisibleKey>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="start"
              className="z-50 w-[240px] overflow-y-auto rounded-lg shadow-lg p-0"
            >
              <div
                className="text-sm"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.stopPropagation();
                }}
              >
                <div className="p-2">
                  <div className="flex justify-between">
                    <span>{t("search.input.searchPopover.title")}</span>

                    <div
                      onClick={handleRefresh}
                      className="size-6 flex justify-center items-center rounded-lg border border-black/10 dark:border-white/10 cursor-pointer"
                    >
                      <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
                        <RefreshCw
                          className={`size-3 text-[#0287FF] transition-transform duration-1000 ${
                            isRefreshDataSource ? "animate-spin" : ""
                          }`}
                        />
                      </VisibleKey>
                    </div>
                  </div>

                  <div className="relative h-8 my-2">
                    <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                      <VisibleKey
                        shortcut="F"
                        shortcutClassName="translate-x-0"
                        onKeyPress={() => {
                          searchInputRef.current?.focus();
                        }}
                      />
                    </div>

                    <PopoverInput
                      autoFocus
                      value={keyword}
                      ref={searchInputRef}
                      className="size-full px-2 rounded-lg border dark:border-white/10 bg-transparent"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setKeyword(e.target.value);
                      }}
                    />
                  </div>

                  {visibleList.length > 0 ? (
                    <ul className="flex flex-col gap-2 p-0">
                      {visibleList?.map((item, index) => {
                        const { id, name } = item;

                        const isAll = index === 0;

                        const isChecked = () => {
                          if (isAll) {
                            return visibleList.slice(1).every((item) => {
                              return MCPIds.includes(item.id);
                            });
                          } else {
                            return MCPIds.includes(id);
                          }
                        };

                        return (
                          <li
                            key={id}
                            className="flex justify-between items-center"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {isAll ? (
                                <Layers className="min-w-4 min-h-4 size-4 text-[#0287FF]" />
                              ) : (
                                <CommonIcon
                                  item={item}
                                  renderOrder={[
                                    "item_icon",
                                    "connector_icon",
                                    "default_icon",
                                  ]}
                                  itemIcon={item.icon}
                                  className="min-w-4 min-h-4 size-4"
                                />
                              )}

                              <span className="truncate">
                                {isAll && name ? t(name) : name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <VisibleKey
                                shortcut={index === 9 ? "0" : String(index + 1)}
                                shortcutClassName="-translate-x-3"
                                onKeyPress={() => {
                                  onSelectDataSource(id, !isChecked(), isAll);
                                }}
                              />

                              <div className="flex justify-center items-center size-[24px]">
                                <Checkbox
                                  checked={isChecked()}
                                  indeterminate={isAll}
                                  onChange={(value) =>
                                    onSelectDataSource(id, value, isAll)
                                  }
                                />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <NoDataImage />
                    </div>
                  )}
                </div>

                {visibleList.length > 0 && (
                  <Pagination
                    current={page}
                    totalPage={totalPage}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    className="dark:border-t-[#202126]"
                  />
                )}
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
