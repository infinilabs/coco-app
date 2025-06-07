import { FC, useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useKeyPress } from "ahooks";
import { debounce, groupBy, isNil } from "lodash-es";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import type { Chat } from "@/types/chat";
import NoDataImage from "../NoDataImage";
import DeleteDialog from "./DeleteDialog";
import HistoryListItem from "./HistoryListItem";

dayjs.extend(isSameOrAfter);

interface HistoryListContentProps {
  chats: Chat[];
  active?: Chat;
  isEdit: boolean;
  onSelect: (chat: Chat) => void;
  onRename: (chatId: string, title: string) => void;
  setIsEdit: (value: boolean) => void;
  onRemove: (chatId: string) => void;
}

const HistoryListContent: FC<HistoryListContentProps> = ({
  chats,
  active,
  isEdit,
  onSelect,
  onRename,
  setIsEdit,
  onRemove,
}) => {
  const { t } = useTranslation();

  const listRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string>("");

  const sortedList = useMemo(() => {
    if (isNil(chats)) return {};

    const now = dayjs();

    return groupBy(chats, (chat) => {
      const date = dayjs(chat._source?.created);

      if (date.isSame(now, "day")) {
        return "history_list.date.today";
      }

      if (date.isSame(now.subtract(1, "day"), "day")) {
        return "history_list.date.yesterday";
      }

      if (date.isSameOrAfter(now.subtract(7, "day"), "day")) {
        return "history_list.date.last7Days";
      }

      if (date.isSameOrAfter(now.subtract(30, "day"), "day")) {
        return "history_list.date.last30Days";
      }

      return date.format("YYYY-MM");
    });
  }, [chats]);

  useKeyPress(["uparrow", "downarrow"], (_, key) => {
    const index = chats.findIndex((item) => item._id === highlightId);
    const length = chats.length;

    let nextIndex = index;

    switch (key) {
      case "uparrow":
        nextIndex = index === 0 ? length - 1 : index - 1;
        break;
      case "downarrow":
        nextIndex = index === length - 1 ? 0 : index + 1;
        break;
    }

    setHighlightId(chats[nextIndex]._id);

    if (key === "enter") {
      onSelect(chats[nextIndex]);
    }
  });

  const debouncedScroll = useCallback(
    debounce((elementId: string) => {
      if (!listRef.current) return;
      const activeEl = listRef.current.querySelector(`#${elementId}`);
      activeEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100),
    []
  );

  useEffect(() => {
    if (!highlightId) return;
    debouncedScroll(highlightId);

    // Cleanup function to cancel any pending debounced calls
    return () => {
      debouncedScroll.cancel();
    };
  }, [highlightId, debouncedScroll]);

  const handleRemove = () => {
    if (!highlightId) return;

    onRemove(highlightId);

    setIsOpen(false);
  };

  

  if (chats.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 pt-8">
        <NoDataImage />
      </div>
    );
  }

  return (
    <>
      <div ref={listRef} className="py-4">
        {Object.entries(sortedList).map(([label, list]) => (
          <div key={label}>
            <span className="text-xs text-[#999] px-3">{t(label)}</span>
            <ul className="p-0">
              {list.map((item) => (
                <HistoryListItem
                  key={item._id}
                  item={item}
                  isActive={
                    item._id === active?._id || item._id === highlightId
                  }
                  isEdit={isEdit}
                  onSelect={onSelect}
                  onRename={onRename}
                  onMouseEnter={() => setHighlightId(item._id)}
                  setIsEdit={setIsEdit}
                  highlightId={highlightId}
                  setIsOpen={setIsOpen}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <DeleteDialog
        isOpen={isOpen}
        active={active}
        setIsOpen={setIsOpen}
        handleRemove={handleRemove}
      />
    </>
  );
};

export default HistoryListContent;
