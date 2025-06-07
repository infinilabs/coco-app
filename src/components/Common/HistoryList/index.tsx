import { Input } from "@headlessui/react";
import { debounce } from "lodash-es";
import { FC, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { PanelLeftClose, RefreshCcw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import VisibleKey from "../VisibleKey";
import { Chat } from "@/types/chat";
import { closeHistoryPanel } from "@/utils";
import HistoryListContent from "./HistoryListContent";

interface HistoryListProps {
  historyPanelId?: string;
  chats: Chat[];
  active?: Chat;
  onSearch: (keyword: string) => void;
  onRefresh: () => void;
  onSelect: (chat: Chat) => void;
  onRename: (chatId: string, title: string) => void;
  onRemove: (chatId: string) => void;
}

const HistoryList: FC<HistoryListProps> = (props) => {
  const {
    historyPanelId,
    chats,
    active,
    onSearch,
    onRefresh,
    onSelect,
    onRename,
    onRemove,
  } = props;
  const { t } = useTranslation();
  const [isEdit, setIsEdit] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isRefresh, setIsRefresh] = useState(false);

  const debouncedSearch = useMemo(() => {
    return debounce((value: string) => onSearch(value), 300);
  }, [onSearch]);

  const handleRefresh = async () => {
    setIsRefresh(true);

    await onRefresh();

    setTimeout(() => {
      setIsRefresh(false);
    }, 1000);
  };

  return (
    <div
      id={historyPanelId}
      className={clsx(
        "flex flex-col h-screen text-sm bg-[#F3F4F6] dark:bg-[#1F2937]"
      )}
    >
      <div className="flex gap-1 p-2 border-b dark:border-[#343D4D]">
        <div className="flex-1 flex items-center gap-2 px-2 rounded-lg border transition border-[#E6E6E6] bg-[#F8F9FA] dark:bg-[#2B3444] dark:border-[#343D4D] focus-within:border-[#0061FF]">
          <VisibleKey
            shortcut="F"
            onKeyPress={() => {
              searchInputRef.current?.focus();
            }}
          >
            <Search className="size-4 text-[#6B7280]" />
          </VisibleKey>

          <Input
            autoFocus
            ref={searchInputRef}
            className="w-full bg-transparent outline-none"
            placeholder={t("history_list.search.placeholder")}
            onChange={(event) => {
              debouncedSearch(event.target.value);
            }}
          />
        </div>

        <div
          className="size-8 flex items-center justify-center rounded-lg border text-[#0072FF] border-[#E6E6E6] bg-[#F3F4F6] dark:border-[#343D4D] dark:bg-[#1F2937] hover:bg-[#F8F9FA] dark:hover:bg-[#353F4D] cursor-pointer transition"
          onClick={handleRefresh}
        >
          <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
            <RefreshCcw
              className={clsx("size-4", {
                "animate-spin": isRefresh,
              })}
            />
          </VisibleKey>
        </div>
      </div>

      <div className="flex-1 px-2 overflow-auto custom-scrollbar">
        <HistoryListContent
          chats={chats}
          active={active}
          isEdit={isEdit}
          onSelect={onSelect}
          onRename={onRename}
          setIsEdit={setIsEdit}
          onRemove={onRemove}
        />
      </div>

      {historyPanelId && (
        <div className="flex justify-end p-2 border-t dark:border-[#343D4D]">
          <VisibleKey shortcut="Esc" shortcutClassName="w-7">
            <PanelLeftClose
              className="size-4 text-black/80 dark:text-white/80 cursor-pointer"
              onClick={closeHistoryPanel}
            />
          </VisibleKey>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
