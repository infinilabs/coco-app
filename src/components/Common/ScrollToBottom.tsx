import { RefObject } from "react";
import clsx from "clsx";
import { ArrowDown } from "lucide-react";
import { Button } from "../ui/button";

interface ScrollToBottomProps {
  scrollRef: RefObject<HTMLDivElement>;
  isAtBottom: boolean;
}

const ScrollToBottom = ({ scrollRef, isAtBottom }: ScrollToBottomProps) => {
  return (
    <Button
      size="icon"
      variant="outline"
      className={clsx(
        "absolute right-4 bottom-4 border border-border rounded-full shadow dark:shadow-white/15",
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
    </Button>
  );
};

export default ScrollToBottom;
