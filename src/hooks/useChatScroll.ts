import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "lodash-es";

export function useChatScroll(messagesEndRef: React.RefObject<HTMLDivElement>) {
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const lastScrollHeightRef = useRef<number>(0);

  const isNearBottom = (container: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return Math.abs(scrollHeight - scrollTop - clientHeight) < 150;
  };

  const scrollToBottom = useCallback(
    debounce(() => {
      const container = messagesEndRef.current?.parentElement;
      if (!container) return;

      const contentChanged = lastScrollHeightRef.current !== container.scrollHeight;
      lastScrollHeightRef.current = container.scrollHeight;

      if (!userScrolling || (contentChanged && isNearBottom(container))) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 50),
    [userScrolling, messagesEndRef]
  );

  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;

    lastScrollHeightRef.current = container.scrollHeight;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const near = isNearBottom(container);
      if (!near) {
        setUserScrolling(true);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (isNearBottom(container)) {
          setUserScrolling(false);
        }
      }, 300);
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