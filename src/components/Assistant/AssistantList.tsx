import { useState, useRef, useCallback, useMemo } from "react";
import {
  ChevronDownIcon,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAppStore } from "@/stores/appStore";
import logoImg from "@/assets/icon.svg";
import platformAdapter from "@/utils/platformAdapter";
import VisibleKey from "@/components/Common/VisibleKey";
import { useConnectStore } from "@/stores/connectStore";
import FontIcon from "@/components/Common/Icons/FontIcon";
import { useChatStore } from "@/stores/chatStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { Post } from "@/api/axiosRequest";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  useAsyncEffect,
  useDebounce,
  useKeyPress,
  usePagination,
} from "ahooks";
import clsx from "clsx";
import NoDataImage from "../Common/NoDataImage";
import PopoverInput from "../Common/PopoverInput";
import { isNil } from "lodash-es";

interface AssistantListProps {
  assistantIDs?: string[];
}

export function AssistantList({ assistantIDs = [] }: AssistantListProps) {
  const { t } = useTranslation();
  const { connected } = useChatStore();
  const isTauri = useAppStore((state) => state.isTauri);
  const setAssistantList = useConnectStore((state) => state.setAssistantList);
  const currentService = useConnectStore((state) => state.currentService);
  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const setCurrentAssistant = useConnectStore((state) => {
    return state.setCurrentAssistant;
  });
  const aiAssistant = useShortcutsStore((state) => state.aiAssistant);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const popoverButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState("");
  const debounceKeyword = useDebounce(keyword, { wait: 500 });

  const currentServiceId = useMemo(() => {
    return currentService?.id;
  }, [connected, currentService?.id]);

  const fetchAssistant = async (params: {
    current: number;
    pageSize: number;
  }) => {
    try {
      const { pageSize, current } = params;

      const from = (current - 1) * pageSize;
      const size = pageSize;

      let response: any;

      const body: Record<string, any> = {
        serverId: currentServiceId,
        from,
        size,
      };

      if (debounceKeyword || assistantIDs.length > 0) {
        body.query = {
          bool: {
            must: [],
          },
        };
        if (debounceKeyword) {
          body.query.bool.must.push({
            query_string: {
              fields: ["combined_fulltext"],
              query: debounceKeyword,
              fuzziness: "AUTO",
              fuzzy_prefix_length: 2,
              fuzzy_max_expansions: 10,
              fuzzy_transpositions: true,
              allow_leading_wildcard: false,
            },
          });
        }
        if (assistantIDs.length > 0) {
          body.query.bool.must.push({
            terms: {
              id: assistantIDs.map((id) => id),
            },
          });
        }
      }

      if (isTauri) {
        if (!currentServiceId) {
          throw new Error("currentServiceId is undefined");
        }

        response = await platformAdapter.commands("assistant_search", body);
      } else {
        const [error, res] = await Post(`/assistant/_search`, body);

        if (error) {
          throw new Error(error);
        }

        response = res;
      }

      console.log("assistant_search", response);

      let assistantList = response?.hits?.hits ?? [];

      if (assistantList.length > 0) {
        const matched = assistantList.find((item: any) => {
          return item._id === currentAssistant?._id;
        });

        if (matched) {
          setCurrentAssistant(matched);
        } else {
          setCurrentAssistant(assistantList[0]);
        }
      }

      return {
        total: response.hits.total.value,
        list: assistantList,
      };
    } catch (error) {
      setCurrentAssistant(null);

      console.error("assistant_search", error);

      return {
        total: 0,
        list: [],
      };
    }
  };

  useAsyncEffect(async () => {
    const data = await fetchAssistant({ current: 1, pageSize: 1000 });

    setAssistantList(data.list);
  }, [currentServiceId]);

  const { pagination, runAsync } = usePagination(fetchAssistant, {
    defaultPageSize: 5,
    refreshDeps: [currentServiceId, debounceKeyword],
    onSuccess(data) {
      setAssistants(data.list);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await runAsync({ current: 1, pageSize: 5 });

    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useKeyPress(["uparrow", "downarrow"], (_, key) => {
    const isClose = isNil(popoverButtonRef.current?.dataset["open"]);
    const index = assistants.findIndex(
      (item) => item._id === currentAssistant?._id
    );
    const length = assistants.length;

    if (isClose || length <= 1) return;

    let nextIndex = index;

    if (key === "uparrow") {
      nextIndex = index > 0 ? index - 1 : length - 1;
    } else {
      nextIndex = index < length - 1 ? index + 1 : 0;
    }

    setCurrentAssistant(assistants[nextIndex]);
  });

  const handlePrev = useCallback(() => {
    if (pagination.current <= 1) return;

    pagination.changeCurrent(pagination.current - 1);
  }, [pagination]);

  const handleNext = useCallback(() => {
    if (pagination.current >= pagination.totalPage) {
      return;
    }

    pagination.changeCurrent(pagination.current + 1);
  }, [pagination]);

  return (
    <div className="relative">
      <Popover>
        <PopoverButton
          ref={popoverButtonRef}
          className="h-6  p-1 px-1.5 flex items-center gap-1 rounded-full bg-white dark:bg-[#202126] text-sm/6 font-semibold text-gray-800 dark:text-[#d8d8d8] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
        >
          <div className="w-4 h-4 flex justify-center items-center rounded-full bg-white border border-[#E6E6E6]">
            {currentAssistant?._source?.icon?.startsWith("font_") ? (
              <FontIcon
                name={currentAssistant._source.icon}
                className="w-3 h-3"
              />
            ) : (
              <img
                src={logoImg}
                className="w-3 h-3"
                alt={t("assistant.message.logo")}
              />
            )}
          </div>
          <div className="max-w-[100px] truncate">
            {currentAssistant?._source?.name || "Coco AI"}
          </div>
          <VisibleKey
            shortcut={aiAssistant}
            onKeyPress={() => {
              popoverButtonRef.current?.click();
            }}
          >
            <ChevronDownIcon className="size-4 text-gray-500 dark:text-gray-400 transition-transform" />
          </VisibleKey>
        </PopoverButton>

        <PopoverPanel className="absolute z-50 top-full mt-1 left-0 w-60 rounded-xl bg-white dark:bg-[#202126] p-3 text-sm/6 text-[#333] dark:text-[#D8D8D8] shadow-lg border dark:border-white/10 focus:outline-none max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex items-center justify-between text-sm font-bold">
            <div>
              {t("assistant.popover.title")}（{pagination.total}）
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center justify-center size-6 bg-white dark:bg-[#202126] rounded-lg border dark:border-white/10"
              disabled={isRefreshing}
            >
              <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
                <RefreshCw
                  className={clsx(
                    "size-3 text-[#0287FF] transition-transform duration-1000",
                    {
                      "animate-spin": isRefreshing,
                    }
                  )}
                />
              </VisibleKey>
            </button>
          </div>

          <VisibleKey
            shortcut="F"
            rootClassName="w-full my-3"
            shortcutClassName="left-4"
            onKeyPress={() => {
              searchInputRef.current?.focus();
            }}
          >
            <PopoverInput
              ref={searchInputRef}
              autoFocus
              value={keyword}
              placeholder={t("assistant.popover.search")}
              className="w-full h-8 px-2 bg-transparent border rounded-md dark:border-white/10"
              onChange={(event) => {
                console.log("onChange", event.target.value);
                setKeyword(event.target.value.trim());
              }}
            />
          </VisibleKey>

          {assistants.length > 0 ? (
            <>
              {assistants.map((assistant) => {
                const { _id, _source, name } = assistant;

                const isActive = currentAssistant?._id === _id;

                return (
                  <button
                    key={_id}
                    className={clsx(
                      "w-full flex items-center h-[50px] gap-2 rounded-lg p-2 mb-1 hover:bg-[#E6E6E6] dark:hover:bg-[#1F2937] transition",
                      {
                        "bg-[#E6E6E6] dark:bg-[#1F2937]": isActive,
                      }
                    )}
                    onClick={() => {
                      setCurrentAssistant(assistant);
                    }}
                  >
                    <div className="flex items-center justify-center size-6 bg-white border border-[#E6E6E6] rounded-full overflow-hidden">
                      {_source?.icon?.startsWith("font_") ? (
                        <FontIcon name={_source?.icon} className="size-4" />
                      ) : (
                        <img src={logoImg} className="size-4" alt={name} />
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {_source?.name || "-"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {_source?.description || ""}
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex items-center">
                        <VisibleKey
                          shortcut="↓↑"
                          shortcutClassName="w-6 -translate-x-4"
                        >
                          <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </VisibleKey>
                      </div>
                    )}
                  </button>
                );
              })}

              <div className="flex items-center justify-between h-8 -mx-3 -mb-3 px-3 text-[#999] border-t dark:border-t-white/10">
                <VisibleKey shortcut="leftarrow" onKeyPress={handlePrev}>
                  <ChevronLeft
                    className="size-4 cursor-pointer"
                    onClick={handlePrev}
                  />
                </VisibleKey>

                <div className="text-xs">
                  {pagination.current}/{pagination.totalPage}
                </div>

                <VisibleKey shortcut="rightarrow" onKeyPress={handleNext}>
                  <ChevronRight
                    className="size-4 cursor-pointer"
                    onClick={handleNext}
                  />
                </VisibleKey>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center py-2">
              <NoDataImage />
            </div>
          )}
        </PopoverPanel>
      </Popover>
    </div>
  );
}
