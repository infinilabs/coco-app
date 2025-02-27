import {
  Search,
  ChevronUp,
  ChevronDown,
  SquareArrowOutUpRight,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { OpenURLWithBrowser } from "@/utils/index";

interface SourceResultProps {
  text: string;
  prefix?: string;
  data?: any[];
  total?: string;
  type?: string;
}

interface SourceItem {
  url?: string;
  title?: string;
  category?: string;
  source?: {
    name: string;
  };
}

export const SourceResult = ({ text, prefix, data, total, type }: SourceResultProps) => {
  const { t } = useTranslation();
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  console.log('SourceResult props:', { text, prefix, data, total, type }); // 调试日志

  return (
    <div className="space-y-2 mb-3">
      <div className="text-sm text-gray-500">{prefix}</div>
      <button
        onClick={() => setIsSourceExpanded(prev => !prev)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-xl border border-[#E6E6E6] dark:border-[#272626]"
      >
        <Search className="w-4 h-4 text-[#999999]" />
        <span className="text-xs text-[#999999]">
          {t("assistant.source.foundResults", { count: Number(total) })}
        </span>
        {isSourceExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isSourceExpanded && data && (
        <div className="space-y-2">
          {data.map((item: SourceItem, idx: number) => (
            <div
              key={idx}
              onClick={() => item.url && OpenURLWithBrowser(item.url)}
              className="group flex items-center p-2 hover:bg-[#F7F7F7] dark:hover:bg-[#2C2C2C] border rounded cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {item.title || item.category}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {item.source?.name}
                </div>
              </div>
              <SquareArrowOutUpRight className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
