import { useState, useRef, useCallback } from "react";
import { ChevronDownIcon, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isNil } from "lodash-es";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useDebounce, useKeyPress, usePagination } from "ahooks";
import clsx from "clsx";

import logoImg from "@/assets/icon.svg";
import VisibleKey from "@/components/Common/VisibleKey";
import { useConnectStore } from "@/stores/connectStore";
import FontIcon from "@/components/Common/Icons/FontIcon";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import NoDataImage from "@/components/Common/NoDataImage";
import PopoverInput from "@/components/Common/PopoverInput";
import { AssistantFetcher } from "./AssistantFetcher";
import AssistantItem from "./AssistantItem";
import Pagination from "@/components/Common/Pagination";

interface AssistantListProps {
  assistantIDs?: string[];
}

export function AssistantList({ assistantIDs = [] }: AssistantListProps) {
  const { t } = useTranslation();

  const currentService = useConnectStore((state) => state.currentService);
  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const setCurrentAssistant = useConnectStore((state) => {
    return state.setCurrentAssistant;
  });
  const aiAssistant = useShortcutsStore((state) => state.aiAssistant);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState("");
  const debounceKeyword = useDebounce(keyword, { wait: 500 });

  const { fetchAssistant } = AssistantFetcher({
    debounceKeyword,
    assistantIDs,
  });

  const { pagination, runAsync } = usePagination(fetchAssistant, {
    defaultPageSize: 5,
    refreshDeps: [currentService?.id, debounceKeyword],
    onSuccess(data) {
      setAssistants(data.list);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await runAsync({ current: 1, pageSize: 5 });

    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  useKeyPress(
    ["uparrow", "downarrow", "enter"],
    (event, key) => {
      const isClose = isNil(popoverButtonRef.current?.dataset["open"]);

      if (isClose) return;

      event.stopPropagation();
      event.preventDefault();

      setIsKeyboardActive(true);

      const index = assistants.findIndex(
        (item) => item._id === currentAssistant?._id
      );
      const length = assistants.length;

      if (length <= 1) return;

      let nextIndex = highlightIndex === -1 ? index : highlightIndex;

      if (key === "uparrow") {
        nextIndex = nextIndex > 0 ? nextIndex - 1 : length - 1;
      } else if (key === "downarrow") {
        nextIndex = nextIndex < length - 1 ? nextIndex + 1 : 0;
      }

      if (key === "enter") {
        setCurrentAssistant(assistants[nextIndex]);
        return popoverButtonRef.current?.click();
      }

      setHighlightIndex(nextIndex);
    },
    {
      target: popoverRef,
    }
  );

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

  const handleMouseMove = useCallback(() => {
    setHighlightIndex(-1);
    setIsKeyboardActive(false);
  }, []);

  return (
    <div className="relative">
      <Popover ref={popoverRef}>
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

        <PopoverPanel
          className="absolute z-50 top-full mt-1 left-0 w-60 rounded-xl bg-white dark:bg-[#202126] p-3 text-sm/6 text-[#333] dark:text-[#D8D8D8] shadow-lg border dark:border-white/10 focus:outline-none max-h-[calc(100vh-80px)] overflow-y-auto"
          onMouseMove={handleMouseMove}
        >
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
                setKeyword(event.target.value.trim());
              }}
            />
          </VisibleKey>

          {assistants.length > 0 ? (
            <>
              {assistants.map((assistant, index) => {
                return (
                  <AssistantItem
                    key={assistant._id}
                    {...assistant}
                    isActive={currentAssistant?._id === assistant._id}
                    isHighlight={highlightIndex === index}
                    isKeyboardActive={isKeyboardActive}
                    onClick={() => {
                      setCurrentAssistant(assistant);
                      popoverButtonRef.current?.click();
                    }}
                  />
                );
              })}

              <Pagination
                current={pagination.current}
                totalPage={pagination.totalPage}
                onPrev={handlePrev}
                onNext={handleNext}
                className="-mx-3 -mb-3"
              />
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
