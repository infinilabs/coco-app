import { ChevronDown, ChevronUp, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { IChunkData } from "@/components/Assistant/types";
import SelectionIcon from "@/icons/Selection";

interface PickSourceProps {
  Detail?: any;
  ChunkData?: IChunkData;
  loading?: boolean;
}

interface IData {
  explain: string;
  id: string;
  title: string;
}

export const PickSource = ({
  Detail,
  ChunkData,
  loading,
}: PickSourceProps) => {
  const { t } = useTranslation();

  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const [Data, setData] = useState<IData[]>([]);

  useEffect(() => {
    if (!Detail?.payload) return;
    setData(Detail?.payload);
  }, [Detail?.payload]);

  useEffect(() => {
    if (!ChunkData?.message_chunk) return;

    if (!loading) {
      try {
        const cleanContent = ChunkData.message_chunk.replace(/^"|"$/g, "");
        const allMatches = cleanContent.match(/<JSON>([\s\S]*?)<\/JSON>/g);

        if (allMatches) {
          for (let i = allMatches.length - 1; i >= 0; i--) {
            try {
              const jsonString = allMatches[i].replace(/<JSON>|<\/JSON>|<think>|<\/think>/g, "");
              const data = JSON.parse(jsonString.trim());

              if (
                Array.isArray(data) &&
                data.every((item) => item.id && item.title && item.explain)
              ) {
                setData(data);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse pick source data:", e);
      }
    }
  }, [ChunkData?.message_chunk, loading]);

  // Must be after hooks !!!
  if (!ChunkData && !Detail) return null;

  return (
    <div className="space-y-2 mb-3 w-full">
      <button
        onClick={() => setIsThinkingExpanded((prev) => !prev)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-xl transition-colors border border-[#E6E6E6] dark:border-[#272626]"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin text-[#1990FF]" />
            <span className="text-xs text-[#999999] italic">
              {t(`assistant.message.steps.pick_source_start`)}
            </span>
          </>
        ) : (
          <>
            <SelectionIcon className="w-4 h-4 text-[#38C200]" />
            <span className="text-xs text-[#999999]">
              {t(
                `assistant.message.steps.${
                  ChunkData?.chunk_type || Detail.type
                }`,
                {
                  count: Data?.length,
                }
              )}
            </span>
          </>
        )}
        {isThinkingExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {isThinkingExpanded && (
        <div className="pl-2 border-l-2 border-[#e5e5e5] dark:border-[#4e4e56]">
          <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
            <div className="mb-4 space-y-3 text-xs">
              {Data?.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-[#E6E6E6] dark:border-[#272626] bg-white dark:bg-[#1E1E1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2C] transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-[#333333] dark:text-[#D8D8D8]">
                      {item.title}
                    </div>
                    <div className="text-xs text-[#666666] dark:text-[#A3A3A3] line-clamp-2">
                      {item.explain}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
