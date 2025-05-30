import { ArrowBigRight } from "lucide-react";

import { useThemeStore } from "@/stores/themeStore";
import ThemedIcon from "@/components/Common/Icons/ThemedIcon";
import CommonIcon from "@/components/Common/Icons/CommonIcon";
import IconWrapper from "@/components/Common/Icons/IconWrapper";
import VisibleKey from "@/components/Common/VisibleKey";
import source_default_img from "@/assets/images/source_default.png";
import source_default_dark_img from "@/assets/images/source_default_dark.png";
import type { QueryHits } from "@/types/search";

interface SearchSourceProps {
  sourceName: string;
  items: QueryHits[];
  selectedName: string;
  showIndex: boolean;
  onGoToTwoPage: () => void;
}

export const SearchSource: React.FC<SearchSourceProps> = ({
  sourceName,
  items,
  selectedName,
  showIndex,
  onGoToTwoPage,
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const hideArrow =
    items[0]?.document.category === "Calculator" ||
    items[0]?.document.category === "AI Overview";

  return (
    <div className="p-2 text-xs text-[#999] dark:text-[#666] flex items-center gap-2.5 relative">
      <CommonIcon
        item={items[0]?.document}
        renderOrder={["connector_icon", "default_icon"]}
        itemIcon={items[0]?.document?.source?.icon}
        defaultIcon={isDark ? source_default_dark_img : source_default_img}
        className="w-4 h-4"
      />
      {sourceName} {items[0]?.source?.name && `- ${items[0].source.name}`}
      <div className="flex-1 border-b border-b-[#e6e6e6] dark:border-b-[#272626]"></div>
      {!hideArrow && (
        <>
          <IconWrapper
            className="w-4 h-4 cursor-pointer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onGoToTwoPage();
            }}
          >
            <ThemedIcon component={ArrowBigRight} className="w-4 h-4" />
          </IconWrapper>
          {showIndex && sourceName === selectedName && (
            <div className="absolute top-1 right-4">
              <VisibleKey shortcut="→" />
            </div>
          )}
        </>
      )}
    </div>
  );
};
