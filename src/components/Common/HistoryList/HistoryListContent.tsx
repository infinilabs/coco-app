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
  onSelect: (chat: Chat) => void;
  onRename: (chatId: string, title: string) => void;
  onRemove: (chatId: string) => void;
}

const HistoryListContent: FC<HistoryListContentProps> = ({
  chats,
  active,
  onSelect,
  onRename,
  onRemove,
}) => {
  const { t } = useTranslation();

  const listRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string>("");

  const sortedList = useMemo(() => {
    console.log(333333, chats);
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

  // Flatten sorted list for navigation while keeping original structure for display
  const flattenedChats = useMemo(() => {
    console.log(4444444, sortedList);
    return Object.values(sortedList).flat();
  }, [sortedList]);

  useKeyPress(
    ["uparrow", "downarrow", "enter"],
    (event, key) => {
      // Stop event propagation and prevent default
      event?.preventDefault();
      event?.stopPropagation();
      event?.stopImmediatePropagation();

      const currentIndex = flattenedChats.findIndex(
        (chat) => chat._id === highlightId
      );
      const length = flattenedChats.length;

      if (length === 0) return;

      let nextIndex = currentIndex;

      switch (key) {
        case "uparrow":
          nextIndex = currentIndex <= 0 ? length - 1 : currentIndex - 1;
          break;
        case "downarrow":
          nextIndex = currentIndex >= length - 1 ? 0 : currentIndex + 1;
          break;
        case "enter":
          if (currentIndex >= 0) {
            onSelect(flattenedChats[currentIndex]);
          }
          break;
      }

      // Set initial highlight if none exists
      if (currentIndex === -1) {
        nextIndex = key === "uparrow" ? length - 1 : 0;
      }

      setHighlightId(flattenedChats[nextIndex]._id);
    },
    {
      // Add options to ensure events are handled early
      useCapture: true,
    }
  );

  const handleRemove = () => {
    if (!highlightId) return;

    onRemove(highlightId);

    setIsOpen(false);
  };

  // Add ref for observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Separate scroll handlers for keyboard and mouse
  const scrollToElement = useCallback(
    (elementId: string, isKeyboardNav: boolean) => {
      if (!listRef.current) return;
      const element = listRef.current.querySelector(`#${elementId}`);
      if (!element) return;

      // Check if element is in viewport
      const rect = element.getBoundingClientRect();
      const isVisible =
        rect.top >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight);

      // Only scroll if element is not visible
      if (!isVisible) {
        element.scrollIntoView({
          behavior: isKeyboardNav ? "smooth" : "auto",
          block: isKeyboardNav ? "nearest" : "center",
        });
      }
    },
    []
  );

  // Debounced scroll for mouse hover
  const debouncedMouseScroll = useCallback(
    debounce((elementId: string) => scrollToElement(elementId, false), 150),
    [scrollToElement]
  );

  // Immediate scroll for keyboard navigation
  const keyboardScroll = useCallback(
    (elementId: string) => {
      scrollToElement(elementId, true);
    },
    [scrollToElement]
  );

  // Setup intersection observer
  useEffect(() => {
    if (!listRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && entry.target.id === highlightId) {
            scrollToElement(highlightId, false);
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [scrollToElement]);

  // Handle highlight changes
  useEffect(() => {
    if (!highlightId) return;

    // Clear previous observations
    observerRef.current?.disconnect();

    const element = listRef.current?.querySelector(`#${highlightId}`);
    if (element) {
      observerRef.current?.observe(element);
    }

    const isKeyboardNav = document.activeElement?.tagName !== "LI";
    if (isKeyboardNav) {
      keyboardScroll(highlightId);
    } else {
      debouncedMouseScroll(highlightId);
    }

    return () => {
      debouncedMouseScroll.cancel();
    };
  }, [highlightId, keyboardScroll, debouncedMouseScroll]);

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
                  onSelect={onSelect}
                  onRename={onRename}
                  onMouseEnter={() => setHighlightId(item._id)}
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
