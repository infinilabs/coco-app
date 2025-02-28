import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { IChunkData } from "@/components/Assistant/types";

interface ThinkProps {
  ChunkData?: IChunkData;
}

export const Think = ({ ChunkData }: ThinkProps) => {
  const { t } = useTranslation();
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  const [loading, setLoading] = useState(true);
  const [Data, setData] = useState("");

  useEffect(() => {
    if (!ChunkData?.message_chunk) return;
    const timerID = setTimeout(() => {
      if (ChunkData.message_chunk === Data) {
        setLoading(false);
        clearTimeout(timerID);
      }
    }, 500);
    setData(ChunkData?.message_chunk);
    return () => {
      timerID && clearTimeout(timerID);
    };
  }, [ChunkData?.message_chunk, Data, loading]);

  // Must be after hooks ！！！
  if (!ChunkData) return null;

  return (
    <div className="space-y-2 mb-3 w-full">
      <button
        onClick={() => setIsThinkingExpanded((prev) => !prev)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-xl transition-colors border border-[#E6E6E6] dark:border-[#272626]"
      >
        {loading ? (
          <>
            <Brain className="w-4 h-4 animate-pulse text-[#999999]" />
            <span className="text-xs text-[#999999] italic">
              {t(`assistant.message.steps.${ChunkData?.chunk_type}`)}
            </span>
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 text-[#38C200]" />
            <span className="text-xs text-[#999999]">
              {t("assistant.message.steps.thoughtTime")}
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
            {Data?.split("\n").map(
              (paragraph, idx) =>
                paragraph.trim() && (
                  <p key={idx} className="text-sm">
                    {paragraph}
                  </p>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
