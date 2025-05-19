import { ChevronDown, ChevronUp, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { IChunkData } from "@/types/chat";
import UnderstandIcon from "@/icons/Understand";

interface QueryIntentProps {
  Detail?: any;
  ChunkData?: IChunkData;
  getSuggestion?: (suggestion: string[]) => void;
  loading?: boolean;
}

interface IQueryData {
  category: string;
  intent: string;
  query: string[];
  keyword: string[];
  suggestion: string[];
}

export const QueryIntent = ({
  Detail,
  ChunkData,
  getSuggestion,
  loading,
}: QueryIntentProps) => {
  const { t } = useTranslation();

  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const [data, setData] = useState<IQueryData | null>(null);

  useEffect(() => {
    if (!Detail?.payload) return;
    setData(Detail?.payload);
    if (Detail?.payload?.suggestion && getSuggestion) {
      getSuggestion(Detail?.payload?.suggestion);
    }
  }, [Detail?.payload]);

  useEffect(() => {
    if (!ChunkData?.message_chunk) return;
    if (!loading) {
      const cleanContent = ChunkData.message_chunk.replace(/^"|"$/g, "");
      const allMatches = cleanContent.match(/<JSON>([\s\S]*?)<\/JSON>/g);
      if (allMatches) {
        const lastMatch = allMatches[allMatches.length - 1];
        const jsonString = lastMatch.replace(/<JSON>|<\/JSON>/g, "");
        const data = JSON.parse(jsonString);
        //console.log("QueryIntent", data);
        if (data?.suggestion && getSuggestion) {
          getSuggestion(data?.suggestion);
        }
        setData(data);
      }
    }
  }, [ChunkData?.message_chunk, loading]);

  useEffect(() => {
    if (!ChunkData?.message_chunk) return;
    try {
    } catch (e) {
      console.error("Failed to parse query data:", e);
    }
  }, [ChunkData?.message_chunk]);

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
              {t(`assistant.message.steps.${ChunkData?.chunk_type || Detail.type}`)}
            </span>
          </>
        ) : (
          <>
            <UnderstandIcon className="w-4 h-4 text-[#38C200]" />
            <span className="text-xs text-[#999999]">
              {t(`assistant.message.steps.${ChunkData?.chunk_type || Detail.type}`)}
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
            <div className="mb-4 space-y-2 text-xs">
              {data?.keyword ? (
                <div className="flex gap-1">
                  <span className="text-[#999999]">
                    - {t("assistant.message.steps.keywords")}：
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {data?.keyword?.map((keyword, index) => (
                      <span
                        key={keyword + index}
                        className="text-[#333333] dark:text-[#D8D8D8]"
                      >
                        {keyword}
                        {index < 2 && "、"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {data?.category ? (
                <div className="flex items-center gap-1">
                  <span className="text-[#999999]">
                    - {t("assistant.message.steps.questionType")}：
                  </span>
                  <span className="text-[#333333] dark:text-[#D8D8D8]">
                    {data?.category}
                  </span>
                </div>
              ) : null}
              {data?.intent ? (
                <div className="flex items-start gap-1">
                  <span className="text-[#999999]">
                    - {t("assistant.message.steps.userIntent")}：
                  </span>
                  <div className="flex-1 text-[#333333] dark:text-[#D8D8D8]">
                    {data?.intent}
                  </div>
                </div>
              ) : null}
              {data?.query ? (
                <div className="flex items-start gap-1">
                  <span className="text-[#999999]">
                    - {t("assistant.message.steps.relatedQuestions")}：
                  </span>
                  <div className="flex-1 flex flex-col text-[#333333] dark:text-[#D8D8D8]">
                    {data?.query?.map((question, qIndex) => (
                      <span key={question + qIndex}>- {question}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
