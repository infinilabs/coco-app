import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "lodash-es";

export function useChatScroll(messagesEndRef: React.RefObject<HTMLDivElement>) {
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = useCallback(
    debounce(() => {
      if (!userScrolling) {
        const container = messagesEndRef.current?.parentElement;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }, 100),
    [userScrolling, messagesEndRef]
  );

  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom =
        Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

      setUserScrolling(!isAtBottom);

      if (isAtBottom) {
        setUserScrolling(false);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const {
          scrollTop: newScrollTop,
          scrollHeight: newScrollHeight,
          clientHeight: newClientHeight,
        } = container;
        const nowAtBottom =
          Math.abs(newScrollHeight - newScrollTop - newClientHeight) < 10;
        if (nowAtBottom) {
          setUserScrolling(false);
        }
      }, 500);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messagesEndRef]);

  return {
    userScrolling,
    scrollToBottom
  };
}