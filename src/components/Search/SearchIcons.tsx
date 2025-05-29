import { useSearchStore } from "@/stores/searchStore";
import { ArrowBigLeft, Search, X } from "lucide-react";

import FontIcon from "@/components/Common/Icons/FontIcon";

interface SearchIconsProps {
  lineCount: number;
  isChatMode: boolean;
  assistant?: any;
}

export default function SearchIcons({
  lineCount,
  isChatMode,
  assistant,
}: SearchIconsProps) {
  const { sourceData, setSourceData, goAskAi, setGoAskAi } = useSearchStore();

  if (isChatMode) {
    return null;
  }

  const renderContent = () => {
    if (goAskAi && assistant) {
      return (
        <div className="flex h-8 -my-1">
          <div className="flex items-center gap-2 pl-2 text-sm bg-white dark:bg-black">
            <div className="flex items-center gap-1 text-[#333] dark:text-[#D8D8D8]">
              {assistant.icon?.startsWith("font_") ? (
                <FontIcon name={assistant.icon} className="size-5" />
              ) : (
                <img src={assistant.icon} className="size-5" />
              )}
              <span>{assistant.name}</span>
            </div>

            <X
              className="size-4 text-[#999] cursor-pointer"
              onClick={() => {
                setGoAskAi(false);
              }}
            />
          </div>

          <div className="relative w-4 overflow-hidden">
            <div className="absolute size-0 border-[16px] border-transparent border-l-white dark:border-l-black"></div>
          </div>
        </div>
      );
    }

    if (sourceData) {
      return (
        <ArrowBigLeft
          className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8] cursor-pointer"
          onClick={() => setSourceData(undefined)}
        />
      );
    }

    return <Search className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8]" />;
  };

  if (lineCount === 1) {
    return renderContent();
  } else {
    return <div className="w-full flex items-center">{renderContent()}</div>;
  }
}
