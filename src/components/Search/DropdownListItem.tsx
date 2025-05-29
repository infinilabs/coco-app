import { memo } from "react";
import clsx from "clsx";

import Calculator from "./Calculator";
import SearchListItem from "./SearchListItem";
import type { SearchDocument } from "@/types/search";

interface DropdownListItemProps {
  item: SearchDocument;
  selectedIndex: number | null;
  currentIndex: number;
  showIndex: boolean;
  memoizedCallbacks: {
    onMouseEnter: (index: number, item: SearchDocument) => () => void;
    onItemClick: (item: SearchDocument) => void;
    goToTwoPage: (item: SearchDocument) => void;
  };
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onContextMenu: (event: React.MouseEvent) => void;
}

const DropdownListItem = memo(
  ({
    item,
    selectedIndex,
    currentIndex,
    showIndex,
    memoizedCallbacks,
    itemRefs,
    onContextMenu,
  }: DropdownListItemProps) => {
    const isCalculator = item.category === "Calculator";
    const isSelected = selectedIndex === currentIndex;

    return (
      <div onContextMenu={onContextMenu}>
        {isCalculator ? (
          <div
            ref={(el) => (itemRefs.current[currentIndex] = el)}
            onMouseEnter={memoizedCallbacks.onMouseEnter(currentIndex, item)}
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
            onMouseEnter={memoizedCallbacks.onMouseEnter(currentIndex, item)}
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
