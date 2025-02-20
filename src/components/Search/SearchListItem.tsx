import React from "react";

import ItemIcon from "@/components/Common/Icons/ItemIcon";
import ListRight from "./ListRight";

interface SearchListItemProps {
  item: any;
  isSelected: boolean;
  currentIndex: number;
  onMouseEnter: () => void;
  onItemClick: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
  showIndex?: boolean;
  goToTwoPage?: (item: any) => void;
  showListRight?: boolean;
}

const SearchListItem: React.FC<SearchListItemProps> = ({
  item,
  isSelected,
  currentIndex,
  showIndex = false,
  showListRight = true,
  onMouseEnter,
  onItemClick,
  goToTwoPage,
  itemRef,
}) => {
  return (
    <div
      ref={itemRef}
      onMouseEnter={onMouseEnter}
      onClick={onItemClick}
      className={`w-full px-2 py-2.5 text-sm flex items-center justify-between rounded-lg transition-colors cursor-pointer ${
        isSelected
          ? "text-white bg-[var(--coco-primary-color)] hover:bg-[var(--coco-primary-color)]"
          : "text-[#333] dark:text-[#d8d8d8]"
      } ${showListRight ? "gap-7" : ""}`}
    >
      <div
        className={`${
          showListRight ? "max-w-[450px]" : "flex-1"
        } min-w-0 flex gap-2 items-center justify-start `}
      >
        <ItemIcon item={item} />
        <span className={`text-sm truncate text-left`}>{item?.title}</span>
      </div>
      {showListRight ? (
        <ListRight
          goToTwoPage={goToTwoPage}
          item={item}
          isSelected={isSelected}
          showIndex={showIndex}
          currentIndex={currentIndex}
        />
      ) : null}
    </div>
  );
};

export default SearchListItem;
