import { RefObject } from "react";
import clsx from "clsx";
import { ArrowDown } from "lucide-react";

interface ScrollToBottomProps {
  scrollRef: RefObject<HTMLDivElement>;
  isAtBottom: boolean;
}

const ScrollToBottom = ({
  scrollRef,
  isAtBottom,
}: ScrollToBottomProps) => {
  return (
    <button
      className={clsx(
        "absolute right-4 bottom-4 flex items-center justify-center size-8 border bg-white rounded-full shadow dark:border-[#272828] dark:bg-black dark:shadow-white/15",
        {
          hidden: isAtBottom,
        }
      )}
      onClick={() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current?.scrollHeight,
          behavior: "smooth",
        });
      }}
    >
      <ArrowDown className="size-5" />
    </button>
  );
};

export default ScrollToBottom;
