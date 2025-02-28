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

export const SourceResult = ({
  prefix,
  data,
  total,
  type,
}: SourceResultProps) => {
  const { t } = useTranslation();
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  return (
    <div
      className={`mt-2 mb-2 w-[98%] ${
        isSourceExpanded
          ? "rounded-lg overflow-hidden border border-[#E6E6E6] dark:border-[#272626]"
          : ""
      }`}
    >
      <button
        onClick={() => setIsSourceExpanded((prev) => !prev)}
        className={`inline-flex justify-between items-center gap-2 px-2 py-1 rounded-xl transition-colors ${
          isSourceExpanded
            ? "w-full"
            : "border border-[#E6E6E6] dark:border-[#272626]"
        }`}
      >
        <div className="flex gap-2">
          <Search className="w-4 h-4 text-[#38C200]" />
          <span className="text-xs text-[#999999]">
            {t(`assistant.message.steps.${type}`, {
              count: Number(total),
            })}
          </span>
        </div>
        {isSourceExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#999999]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#999999]" />
        )}
      </button>

      {isSourceExpanded && (
        <>
          {prefix && (
            <div className="px-3 py-2 bg-[#F7F7F7] dark:bg-[#1E1E1E] text-[#666666] dark:text-[#A3A3A3] text-xs leading-relaxed border-b border-[#E6E6E6] dark:border-[#272626]">
              {prefix}
            </div>
          )}
          {data?.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.url && OpenURLWithBrowser(item.url)}
              className="group flex items-center p-2 hover:bg-[#F7F7F7] dark:hover:bg-[#2C2C2C] border-b border-[#E6E6E6] dark:border-[#272626] last:border-b-0 cursor-pointer transition-colors"
            >
              <div className="w-full flex items-center gap-2">
                <div className="w-[75%] flex items-center gap-1">
                  <Globe className="w-3 h-3 flex-shrink-0" />
                  <div className="text-xs text-[#333333] dark:text-[#D8D8D8] truncate font-normal group-hover:text-[#0072FF] dark:group-hover:text-[#0072FF]">
                    {item.title || item.category}
                  </div>
                </div>
                <div className="w-[25%] flex items-center justify-end gap-2">
                  <span className="text-xs text-[#999999] dark:text-[#999999] truncate">
                    {item.source?.name}
                  </span>
                  <SquareArrowOutUpRight className="w-3 h-3 text-[#999999] dark:text-[#999999] flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
