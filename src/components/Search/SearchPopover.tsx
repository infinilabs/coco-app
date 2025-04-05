import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { ChevronDownIcon, RefreshCw, Layers, Globe } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import TypeIcon from "@/components/Common/Icons/TypeIcon";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import { DataSource } from "@/types/commands";
import Checkbox from "@/components/Common/Checkbox";

interface SearchPopoverProps {
  isSearchActive: boolean;
  setIsSearchActive: () => void;
  getDataSourcesByServer: (serverId: string) => Promise<DataSource[]>;
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

  const [showDataSource, setShowDataSource] = useState(false);

  const getDataSourceList = useCallback(async () => {
    try {
      const res: DataSource[] = await getDataSourcesByServer(
        currentService?.id
      );
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
  }, [currentService?.id]);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showDataSource) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDataSource(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDataSource]);

  useEffect(() => {
    if (dataSourceList.length > 0) {
      onSelectDataSource("all", true, true);
    }
  }, [dataSourceList]);

  useEffect(() => {
    getDataSourceList();
  }, [currentService?.id]);

  const memoizedDataSourceIds = useMemo(
    () => new Set(sourceDataIds),
    [sourceDataIds]
  );

  const onSelectDataSource = useCallback(
    (id: string, checked: boolean, isAll: boolean) => {
      if (isAll) {
        setSourceDataIds(
          checked ? dataSourceList.slice(1).map((item) => item.id) : []
        );
        return;
      }

      const updatedIds = new Set(memoizedDataSourceIds);
      if (checked) {
        updatedIds.add(id);
      } else {
        updatedIds.delete(id);
      }
      setSourceDataIds(Array.from(updatedIds));
    },
    [dataSourceList, memoizedDataSourceIds]
  );

  return (
    <div
      className={clsx(
        "flex items-center gap-1 p-1 h-6 rounded-lg transition hover:bg-[#EDEDED] dark:hover:bg-[#202126] cursor-pointer",
        {
          "!bg-[rgba(0,114,255,0.3)]": isSearchActive,
        }
      )}
      onClick={setIsSearchActive}
    >
      <Globe
        className={`size-4 ${
          isSearchActive
            ? "text-[#0072FF] dark:text-[#0072FF]"
            : "text-[#333] dark:text-white"
        }`}
      />

      {isSearchActive && (
        <>
          <span
            className={isSearchActive ? "text-[#0072FF]" : "dark:text-white"}
          >
            {t("search.input.search")}
          </span>

          {dataSourceList?.length > 0 && (
            <Popover className="relative">
              <PopoverButton
                as="span"
                ref={buttonRef}
                className={clsx("flex items-center")}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDataSource((prev) => !prev);
                }}
              >
                <ChevronDownIcon
                  className={clsx("size-5", [
                    isSearchActive
                      ? "text-[#0072FF] dark:text-[#0072FF]"
                      : "text-[#333] dark:text-white",
                  ])}
                />
              </PopoverButton>

              {showDataSource ? (
                <PopoverPanel
                  static
                  ref={popoverRef}
                  className="absolute z-50 left-0 bottom-6 min-w-[220px] max-h-[400px] overflow-y-auto bg-white dark:bg-[#202126] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div
                    className="text-sm px-[12px] py-[18px]"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="flex justify-between mb-[18px]">
                      <span>{t("search.input.searchPopover.title")}</span>

                      <div
                        onClick={async () => {
                          setIsRefreshDataSource(true);

                          getDataSourceList();

                          setTimeout(() => {
                            setIsRefreshDataSource(false);
                          }, 1000);
                        }}
                        className="size-[24px] flex justify-center items-center rounded-lg border border-black/10 dark:border-white/10 cursor-pointer"
                      >
                        <RefreshCw
                          className={`size-3 text-[#0287FF] transition-transform duration-1000 ${
                            isRefreshDataSource ? "animate-spin" : ""
                          }`}
                        />
                      </div>
                    </div>
                    <ul className="flex flex-col gap-[16px]">
                      {dataSourceList?.map((item, index) => {
                        const { id, name } = item;

                        const isAll = index === 0;

                        return (
                          <li
                            key={id}
                            className="flex justify-between items-center"
                          >
                            <div className="flex items-center gap-[8px]">
                              {isAll ? (
                                <Layers className="size-[16px] text-[#0287FF]" />
                              ) : (
                                <TypeIcon item={item} className="size-[16px]" />
                              )}

                              <span>{isAll && name ? t(name) : name}</span>
                            </div>

                            <div className="flex justify-center items-center size-[24px]">
                              <Checkbox
                                checked={
                                  isAll
                                    ? sourceDataIds.length ===
                                      dataSourceList.length - 1
                                    : sourceDataIds?.includes(id)
                                }
                                indeterminate={isAll}
                                onChange={(value) =>
                                  onSelectDataSource(id, value, isAll)
                                }
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </PopoverPanel>
              ) : null}
            </Popover>
          )}
        </>
      )}
    </div>
  );
}
