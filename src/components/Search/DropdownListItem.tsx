import { memo } from "react";
import clsx from "clsx";

import Calculator from "./Calculator";
import SearchListItem from "./SearchListItem";
import type { Document } from "@/types/search";

interface DropdownListItemProps {
  item: Document;
  isSelected: boolean;
  currentIndex: number;
  showIndex: boolean;
  memoizedCallbacks: {
    onMouseEnter: (index: number) => () => void;
    onItemClick: (item: Document) => void;
    goToTwoPage: (item: Document) => void;
  };
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onContextMenu: (event: React.MouseEvent) => void;
}

const DropdownListItem = memo(
  ({
    item,
    isSelected,
    currentIndex,
    showIndex,
    memoizedCallbacks,
    itemRefs,
    onContextMenu,
  }: DropdownListItemProps) => {
    const isCalculator = item.category === "Calculator";

    return (
      <div onContextMenu={onContextMenu}>
        {isCalculator ? (
          <div
            ref={(el) => (itemRefs.current[currentIndex] = el)}
            onMouseEnter={memoizedCallbacks.onMouseEnter(currentIndex)}
            role="option"
            aria-selected={isSelected}
            id={`search-item-${currentIndex}`}
            className={clsx("p-2 transition rounded-lg", {
              "bg-[#EDEDED] dark:bg-[#202126]": isSelected,
            })}
          >
            <Calculator item={item} isSelected={isSelected} />
          </div>
        ) : (
          <SearchListItem
            item={item}
            isSelected={isSelected}
            currentIndex={currentIndex}
            showIndex={showIndex}
            onMouseEnter={memoizedCallbacks.onMouseEnter(currentIndex)}
            onItemClick={() => memoizedCallbacks.onItemClick(item)}
            goToTwoPage={() => memoizedCallbacks.goToTwoPage(item)}
            itemRef={(el) => (itemRefs.current[currentIndex] = el)}
          />
        )}
      </div>
    );
  }
);

DropdownListItem.displayName = "DropdownListItem";

export default DropdownListItem;
