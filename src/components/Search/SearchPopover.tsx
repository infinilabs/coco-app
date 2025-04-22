import { useState, useEffect, useCallback, useRef } from "react";
import { Input, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  ChevronDownIcon,
  RefreshCw,
  Layers,
  Globe,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import TypeIcon from "@/components/Common/Icons/TypeIcon";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import { DataSource } from "@/types/commands";
import Checkbox from "@/components/Common/Checkbox";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import VisibleKey from "../Common/VisibleKey";
import { useDebounce } from "ahooks";
import NoDataImage from "../Common/NoDataImage";

interface SearchPopoverProps {
  isSearchActive: boolean;
  setIsSearchActive: () => void;
  getDataSourcesByServer: (
    serverId: string,
    options?: {
      from?: number;
      size?: number;
      query?: string;
    }
  ) => Promise<DataSource[]>;
}

export default function SearchPopover({
  isSearchActive,
  setIsSearchActive,
  getDataSourcesByServer,
}: SearchPopoverProps) {
  const { t } = useTranslation();
  const [isRefreshDataSource, setIsRefreshDataSource] = useState(false);
  const [dataSourceList, setDataSourceList] = useState<DataSource[]>([]);

  const sourceDataIds = useSearchStore((state) => state.sourceDataIds);
  const setSourceDataIds = useSearchStore((state) => state.setSourceDataIds);

  const currentService = useConnectStore((state) => state.currentService);

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, { wait: 500 });

  const getDataSourceList = useCallback(async () => {
    try {
      setPage(1);

      const res: DataSource[] = await getDataSourcesByServer(
        currentService?.id,
        {
          query: debouncedKeyword,
        }
      );

      console.log("getDataSourcesByServer", res);

      if (res?.length === 0) {
        setDataSourceList([]);
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

      setDataSourceList(data);
    } catch (err) {
      setDataSourceList([]);
      console.error("get_datasources_by_server", err);
    }
  }, [currentService?.id, debouncedKeyword]);

  const popoverButtonRef = useRef<HTMLButtonElement>(null);
  const internetSearch = useShortcutsStore((state) => state.internetSearch);
  const internetSearchScope = useShortcutsStore((state) => {
    return state.internetSearchScope;
  });
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [visibleList, setVisibleList] = useState<DataSource[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dataSourceList.length > 0) {
      setSourceDataIds(dataSourceList.slice(1).map((item) => item.id));
    }
  }, [dataSourceList]);

  useEffect(() => {
    getDataSourceList();
  }, [currentService?.id, debouncedKeyword]);

  useEffect(() => {
    setTotalPage(Math.max(Math.ceil(dataSourceList.length / 10), 1));
  }, [dataSourceList]);

  useEffect(() => {
    if (dataSourceList.length === 0) {
      return setVisibleList([]);
    }

    const startIndex = (page - 1) * 9;
    const endIndex = startIndex + 9;

    const list = [
      dataSourceList[0],
      ...dataSourceList.slice(1).slice(startIndex, endIndex),
    ];

    setVisibleList(list);
  }, [dataSourceList, page]);

  const onSelectDataSource = useCallback(
    (id: string, checked: boolean, isAll: boolean) => {
      let nextSourceDataIds = new Set(sourceDataIds);

      const ids = isAll ? visibleList.slice(1).map((item) => item.id) : [id];

      for (const id of ids) {
        if (checked) {
          nextSourceDataIds.add(id);
        } else {
          nextSourceDataIds.delete(id);
        }
      }

      setSourceDataIds(Array.from(nextSourceDataIds));
    },
    [visibleList, sourceDataIds]
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

  return (
    <div
      className={clsx(
        "flex items-center gap-1 p-[3px] pr-1 rounded-md transition hover:bg-[#EDEDED] dark:hover:bg-[#202126] cursor-pointer",
        {
          "!bg-[rgba(0,114,255,0.3)]": isSearchActive,
        }
      )}
      onClick={setIsSearchActive}
    >
      <VisibleKey shortcut={internetSearch} onKeyPress={setIsSearchActive}>
        <Globe
          className={`size-3 ${
            isSearchActive
              ? "text-[#0072FF] dark:text-[#0072FF]"
              : "text-[#333] dark:text-white"
          }`}
        />
      </VisibleKey>

      {isSearchActive && (
        <>
          <span
            className={`${
              isSearchActive ? "text-[#0072FF]" : "dark:text-white"
            }`}
          >
            {t("search.input.search")}
          </span>

          <Popover className="relative">
            <PopoverButton ref={popoverButtonRef} className="flex items-center">
              <VisibleKey
                shortcut={internetSearchScope}
                onKeyPress={() => {
                  popoverButtonRef.current?.click();
                }}
              >
                <ChevronDownIcon
                  className={clsx("size-3", [
                    isSearchActive
                      ? "text-[#0072FF] dark:text-[#0072FF]"
                      : "text-[#333] dark:text-white",
                  ])}
                />
              </VisibleKey>
            </PopoverButton>

            <PopoverPanel className="absolute z-50 left-0 bottom-6 w-[240px] overflow-y-auto bg-white dark:bg-[#202126] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div
                className="text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <div className="p-3">
                  <div className="flex justify-between">
                    <span>{t("search.input.searchPopover.title")}</span>

                    <div
                      onClick={handleRefresh}
                      className="size-[24px] flex justify-center items-center rounded-lg border border-black/10 dark:border-white/10 cursor-pointer"
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

                    <Input
                      autoFocus
                      ref={searchInputRef}
                      className="size-full px-2 rounded-lg border dark:border-white/10 bg-transparent"
                      onChange={(e) => {
                        setKeyword(e.target.value);
                      }}
                    />
                  </div>

                  {visibleList.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {visibleList?.map((item, index) => {
                        const { id, name } = item;

                        const isAll = index === 0;

                        const isChecked = () => {
                          if (isAll) {
                            return visibleList.slice(1).every((item) => {
                              return sourceDataIds.includes(item.id);
                            });
                          } else {
                            return sourceDataIds.includes(id);
                          }
                        };

                        return (
                          <li
                            key={id}
                            className="flex justify-between items-center"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {isAll ? (
                                <Layers className="size-[16px] text-[#0287FF]" />
                              ) : (
                                <TypeIcon item={item} className="size-[16px]" />
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
                  <div className="flex items-center justify-between h-8 px-3 border-t dark:border-t-[#202126]">
                    <VisibleKey shortcut="leftarrow" onKeyPress={handlePrev}>
                      <ChevronLeft className="size-4" onClick={handlePrev} />
                    </VisibleKey>

                    <div className="text-xs">
                      {page}/{totalPage}
                    </div>

                    <VisibleKey shortcut="rightarrow" onKeyPress={handleNext}>
                      <ChevronRight className="size-4" onClick={handleNext} />
                    </VisibleKey>
                  </div>
                )}
              </div>
            </PopoverPanel>
          </Popover>
        </>
      )}
    </div>
  );
}
