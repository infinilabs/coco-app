import React, { MouseEvent } from "react";
import clsx from "clsx";
import { File } from "lucide-react";

import CommonIcon from "@/components/Common/Icons/CommonIcon";
import ListRight from "./ListRight";
import { useAppStore } from "@/stores/appStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { SearchDocument } from "@/types/search";
import { useSearchStore } from "@/stores/searchStore";

interface SearchListItemProps {
  item: SearchDocument;
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

    const { setSelectedSearchContent, setVisibleContextMenu } =
      useSearchStore();

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      setVisibleContextMenu(true);
    };

    return (
      <div
        ref={itemRef}
        onMouseEnter={() => {
          setSelectedSearchContent(item);

          onMouseEnter();
        }}
        onClick={onItemClick}
        className={clsx(
          "w-full px-2 py-2.5 text-sm flex mb-0 flex-row items-center mobile:mb-2 mobile:flex-col mobile:items-start justify-between rounded-lg transition-colors cursor-pointer text-[#333] dark:text-[#d8d8d8]",
          {
            "bg-black/10 dark:bg-white/15": isSelected,
            "gap-7 mobile:gap-1": showListRight,
          }
        )}
        role="option"
        aria-selected={isSelected}
        id={`search-item-${currentIndex}`}
        onContextMenu={handleContextMenu}
      >
        <div
          className={`${
            showListRight
              ? "max-w-[450px] mobile:max-w-full mobile:w-full"
              : "flex-1"
          } min-w-0 flex gap-2 items-center justify-start `}
        >
          <CommonIcon
            renderOrder={[
              "special_icon",
              "item_icon",
              "connector_icon",
              "default_icon",
            ]}
            item={item}
            itemIcon={item?.icon}
            defaultIcon={File}
          />
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
