import React from "react";
import clsx from "clsx";

import ItemIcon from "@/components/Common/Icons/ItemIcon";
import ListRight from "./ListRight";
import { useAppStore } from "@/stores/appStore";
import { useIsMobile } from "@/hooks/useIsMobile";

interface SearchListItemProps {
  item: any;
  isSelected: boolean;
  currentIndex: number;
  onMouseEnter: () => void;
  onItemClick: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
  showIndex?: boolean;
  goToTwoPage?: () => void;
  showListRight?: boolean;
}

const SearchListItem: React.FC<SearchListItemProps> = React.memo(
  ({
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
    const isTauri = useAppStore((state) => state.isTauri);

    const isMobile = useIsMobile();

    return (
      <div
        ref={itemRef}
        onMouseEnter={onMouseEnter}
        onClick={onItemClick}
        className={clsx(
          "w-full px-2 py-2.5 text-sm flex mb-0 flex-row items-center mobile:mb-2 mobile:flex-col mobile:items-start justify-between rounded-lg transition-colors cursor-pointer text-[#333] dark:text-[#d8d8d8] mobile:bg-gray-200/80 mobile:dark:bg-gray-700/50",
          {
            "bg-black/10 dark:bg-white/15": isSelected,
            "gap-7 mobile:gap-1": showListRight,
          }
        )}
      >
        <div
          className={`${
            showListRight ? "max-w-[450px] mobile:max-w-full mobile:w-full" : "flex-1"
          } min-w-0 flex gap-2 items-center justify-start `}
        >
          <ItemIcon item={item} />
          <span className={`text-sm truncate text-left`}>{item?.title}</span>
        </div>
        {!isTauri && isMobile ? (
          <div className="w-full text-xs text-gray-500 dark:text-gray-400 truncate">
            {item?.summary}
          </div>
        ) : null}
        {showListRight && (isTauri || !isMobile) ? (
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
  }
);

export default SearchListItem;
