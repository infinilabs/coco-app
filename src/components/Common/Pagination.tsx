import { ChevronLeft, ChevronRight } from "lucide-react";

import VisibleKey from "./VisibleKey";
import { cn } from "@/lib/utils";

interface PaginationProps {
  current: number;
  totalPage: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

function Pagination({
  current,
  totalPage,
  onPrev,
  onNext,
  className = "",
}: PaginationProps) {
  return (
    <div
      className={`flex items-center justify-between h-8 px-2 text-muted-foreground border-t border-input ${className}`}
    >
      <VisibleKey shortcut="leftarrow" onKeyPress={onPrev}>
        <ChevronLeft
          className={cn("size-4 cursor-pointer", {
            "cursor-not-allowed opacity-50": current === 1,
          })}
          onClick={onPrev}
        />
      </VisibleKey>

      <div className="text-xs">
        {current}/{totalPage}
      </div>

      <VisibleKey shortcut="rightarrow" onKeyPress={onNext}>
        <ChevronRight
          className={cn("size-4 cursor-pointer", {
            "cursor-not-allowed opacity-50": current === totalPage,
          })}
          onClick={onNext}
        />
      </VisibleKey>
    </div>
  );
}

export default Pagination;
