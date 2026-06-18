import { useMemo } from "react";
import { SquareArrowOutUpRight } from "lucide-react";

import platformAdapter from "@/utils/platformAdapter";
import type { StepSearchHit } from "./types";

interface ResearchSearchResultsContentProps {
  hits?: StepSearchHit[];
  theme?: "light" | "dark";
}

/**
 * 「搜索结果」tab：按 title 去重后，平铺展示所有步骤的搜索命中。
 * App 没有统一的 SearchResults 组件，这里复用聊天内搜索卡片的轻量样式自建列表。
 */
export const ResearchSearchResultsContent = ({
  hits,
}: ResearchSearchResultsContentProps) => {
  const records = useMemo(() => {
    if (!hits || !Array.isArray(hits)) return [];

    const uniqueHitsMap = new Map<string, StepSearchHit>();

    for (const hit of hits) {
      if (!hit || typeof hit !== "object") continue;
      const title = typeof hit.title === "string" ? hit.title : "";
      if (!title) continue;

      if (!uniqueHitsMap.has(title)) {
        uniqueHitsMap.set(title, hit);
      }
    }

    return Array.from(uniqueHitsMap.values());
  }, [hits]);

  if (records.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2">
      {records.map((hit, idx) => (
        <div
          key={idx}
          className="p-2.5 bg-transparent border border-[#F0F0F0] dark:border-[#303030] rounded-md hover:border-[#1784FC] dark:hover:border-[#7EC2FF] transition-colors cursor-pointer group"
          onClick={() => {
            if (typeof hit.url === "string") {
              platformAdapter.openUrl(hit.url);
            }
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-[#333] dark:text-[#E5E7EB] group-hover:text-[#1784FC] transition-colors line-clamp-1">
                {hit.title}
              </div>
              {hit.content && (
                <div className="text-xs text-[#999] dark:text-[#A6A6A6] mt-1 line-clamp-2">
                  {hit.content}
                </div>
              )}
              {hit.source && (
                <div className="text-xs text-[#B0B0B0] dark:text-[#777] mt-1 truncate">
                  {hit.source}
                </div>
              )}
            </div>
            {hit.url && (
              <SquareArrowOutUpRight className="shrink-0 size-3.5 text-[#999] dark:text-[#A6A6A6] group-hover:text-[#1784FC] dark:group-hover:text-[#7EC2FF] transition-colors" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
