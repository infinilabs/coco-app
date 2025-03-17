import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Checkbox,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import {
  ChevronDownIcon,
  RefreshCw,
  Layers,
  CheckIcon,
  Globe,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import TypeIcon from "@/components/Common/Icons/TypeIcon";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import { DataSource } from "@/components/Assistant/types"

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

  const getDataSourceList = useCallback(async () => {
    try {
      const res: DataSource[] = await getDataSourcesByServer(currentService?.id);
      const data = [
        {
          id: "all",
          name: "search.input.searchPopover.allScope",
        },
        ...(res || []),
      ];
      setDataSourceList(data);
    } catch (err) {
      setDataSourceList([]);
      console.error("get_datasources_by_server", err);
    }
  }, [currentService?.id]);

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
            <Popover>
              <PopoverButton as="span" className={clsx("flex items-center")}>
                <ChevronDownIcon
                  className={clsx("size-5", [
                    isSearchActive
                      ? "text-[#0072FF] dark:text-[#0072FF]"
                      : "text-[#333] dark:text-white",
                  ])}
                />
              </PopoverButton>

              <PopoverPanel
                anchor="top start"
                className="min-w-[220px] bg-white dark:bg-[#202126] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
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

                            <span>{isAll ? t(name) : name}</span>
                          </div>

                          <div className="flex justify-center items-center size-[24px]">
                            <Checkbox
                              checked={
                                isAll
                                  ? sourceDataIds.length ===
                                    dataSourceList.length - 1
                                  : sourceDataIds?.includes(id)
                              }
                              onChange={(value) =>
                                onSelectDataSource(id, value, isAll)
                              }
                              className="group size-[14px] rounded-sm border border-black/30 dark:border-white/30 data-[checked]:bg-[#2F54EB] data-[checked]:!border-[#2F54EB] transition cursor-pointer"
                            >
                              {isAll && (
                                <div className="size-full flex items-center justify-center group-data-[checked]:hidden">
                                  <div className="size-[6px] bg-[#2F54EB]"></div>
                                </div>
                              )}

                              <CheckIcon className="hidden size-[12px] text-white group-data-[checked]:block" />
                            </Checkbox>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </PopoverPanel>
            </Popover>
          )}
        </>
      )}
    </div>
  );
}
