import { ChevronDown, ChevronUp, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { IChunkData } from "@/components/Assistant/types";
import ReadingIcon from "@/icons/Reading";

interface DeepReadeProps {
  Detail?: any;
  ChunkData?: IChunkData;
  loading?: boolean;
}

export const DeepRead = ({
  Detail,
  ChunkData,
  loading,
}: DeepReadeProps) => {
  const { t } = useTranslation();

  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const [Data, setData] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!Detail?.description) return;
    setDescription(Detail?.description);
  }, [Detail?.description]);

  useEffect(() => {
    if (!ChunkData?.message_chunk) return;
    try {
      if (ChunkData.message_chunk.includes("&")) {
        const contentArray = ChunkData.message_chunk.split("&").filter(Boolean);
        setData(contentArray);
      } else {
        setData([ChunkData.message_chunk]);
      }
    } catch (e) {
      console.error("Failed to parse query data:", e);
    }
  }, [ChunkData?.message_chunk]);

  // Must be after hooks ！！！
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
              {t(
                `assistant.message.steps.${
                  ChunkData?.chunk_type || Detail?.type
                }`
              )}
            </span>
          </>
        ) : (
          <>
            <ReadingIcon className="w-4 h-4 text-[#38C200]" />
            <span className="text-xs text-[#999999]">
              {t(
                `assistant.message.steps.${
                  ChunkData?.chunk_type || Detail?.type
                }`,
                {
                  count: Number(Data.length),
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
        <div className="pl-2 border-l-2 border-[e5e5e5]">
          <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
            <div className="mb-4 space-y-3 text-xs">
              {Data?.map((item) => (
                <div key={item} className="flex flex-col gap-2">
                  <div className="text-xs text-[#999999] dark:text-[#808080]">
                    - {item}
                  </div>
                </div>
              ))}
              {description?.split("\n").map(
                (paragraph, idx) =>
                  paragraph.trim() && (
                    <p key={idx} className="text-sm">
                      {paragraph}
                    </p>
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
