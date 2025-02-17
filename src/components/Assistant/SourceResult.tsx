import {
  Search,
  ChevronUp,
  ChevronDown,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { OpenURLWithBrowser } from "@/utils/index";

interface SourceResultProps {
  text: string;
}

interface SourceItem {
  url?: string;
  title?: string;
  category?: string;
  source?: {
    name: string;
  };
}

export function SourceResult({ text }: SourceResultProps) {
  const { t } = useTranslation();
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  if (!text?.includes("<Source")) {
    return null;
  }

  const getSourceData = (): SourceItem[] => {
    try {
      const sourceMatch = text.match(/<Source[^>]*>(.*?)<\/Source>/s);
      if (!sourceMatch) return [];
      return JSON.parse(sourceMatch[1]);
    } catch (error) {
      console.error("Failed to parse source data:", error);
      return [];
    }
  };

  const totalResults = text.match(/total=["']?(\d+)["']?/)?.[1] || "0";
  const sourceData = getSourceData();

  return (
    <div className={`mt-2 ${
      isSourceExpanded
        ? "rounded-lg overflow-hidden border border-[#E6E6E6] dark:border-[#272626]"
        : ""
    }`}>
      <button
        onClick={() => setIsSourceExpanded((prev) => !prev)}
        className={`inline-flex justify-between items-center gap-2 px-2 py-1 rounded-xl transition-colors ${
          isSourceExpanded ? "w-full" : "border border-[#E6E6E6] dark:border-[#272626]"
        }`}
      >
        <div className="flex gap-2">
          <Search className="w-4 h-4 text-[#999999] dark:text-[#999999]" />
          <span className="text-xs text-[#999999] dark:text-[#999999]">
            {t('assistant.source.foundResults', { count: Number(totalResults) })}
          </span>
        </div>
        {isSourceExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#999999] dark:text-[#999999]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#999999] dark:text-[#999999]" />
        )}
      </button>

      {isSourceExpanded && (
        <div className="">
          {sourceData.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.url && OpenURLWithBrowser(item.url)}
              className="group flex items-center px-2 py-1 hover:bg-[#F7F7F7] dark:hover:bg-[#2C2C2C] border-b border-[#E6E6E6] dark:border-[#272626] last:border-b-0 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#333333] dark:text-[#D8D8D8] truncate font-normal group-hover:text-[#0072FF] dark:group-hover:text-[#0072FF]">
                    {item.title || item.category}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-[#999999] dark:text-[#999999]">
                    {item.source?.name}
                  </span>
                  <SquareArrowOutUpRight className="w-3 h-3 text-[#999999] dark:text-[#999999]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
