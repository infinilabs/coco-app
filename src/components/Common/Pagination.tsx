import { ChevronLeft, ChevronRight } from "lucide-react";

import VisibleKey from "./VisibleKey";

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
      className={`flex items-center justify-between h-8 px-3 text-muted-foreground border-t border-input ${className}`}
    >
      <VisibleKey shortcut="leftarrow" onKeyPress={onPrev}>
        <ChevronLeft className="size-4 cursor-pointer" onClick={onPrev} />
      </VisibleKey>

      <div className="text-xs">
        {current}/{totalPage}
      </div>

      <VisibleKey shortcut="rightarrow" onKeyPress={onNext}>
        <ChevronRight className="size-4 cursor-pointer" onClick={onNext} />
      </VisibleKey>
    </div>
  );
}

export default Pagination;
