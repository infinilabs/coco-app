import { ChevronDown, ChevronUp, Loader, BadgeCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { IChunkData } from "./types";

interface QueryIntentProps {
  query_intent: IChunkData | null;
}

export const QueryIntent = ({ query_intent }: QueryIntentProps) => {
  if (!query_intent) return null;

  const { t } = useTranslation();

  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  const [loading, setLoading] = useState(false);
  const [prevContent, setPrevContent] = useState(query_intent?.message_chunk);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isCompleted && query_intent.message_chunk !== prevContent) {
      setLoading(true);
      setPrevContent(query_intent?.message_chunk);
    } else if (query_intent?.message_chunk === prevContent && loading) {
      setLoading(false);
      setIsCompleted(true);
    }
  }, [query_intent?.message_chunk, prevContent, loading, isCompleted]);

  const [queryData, setQueryData] = useState<{
    category: string;
    intent: string;
    query: string[];
    keyword: string[];
  } | null>(null);

  useEffect(() => {
    if (query_intent?.message_chunk) {
      try {
       const cleanContent = query_intent?.message_chunk.replace(/^"|"$/g, '');
       const jsonMatch = cleanContent.match(/<JSON>([\s\S]*?)<\/JSON>/);
       const jsonString = jsonMatch ? jsonMatch[1] : cleanContent;
       const data = JSON.parse(jsonString);
       setQueryData(data);
      } catch (e) {
        console.error("Failed to parse query data:", e);
      }
    }
  }, [query_intent?.message_chunk]);

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
              {t(`assistant.message.steps.${query_intent?.source_type}`)}
            </span>
          </>
        ) : (
          <>
            <BadgeCheck className="w-4 h-4 text-[#38C200]" />
            <span className="text-xs text-[#999999]">
              {t(`assistant.message.steps.${query_intent?.source_type}`)}
            </span>
          </>
        )}
        {query_intent?.message_chunk &&
          (isThinkingExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          ))}
      </button>
      {isThinkingExpanded && query_intent?.message_chunk && (
        <div className="pl-2 border-l-2 border-[e5e5e5]">
          <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
            <div className="mb-4 space-y-2 text-xs">
              {queryData?.keyword ? <div className="flex items-center gap-1">
                <span className="text-[#999999]">
                  {t("assistant.message.steps.keywords")}：
                </span>
                <div className="flex flex-wrap gap-1">
                  {queryData?.keyword?.map((keyword, index) => (
                    <span
                      key={index}
                      className="text-[#333333] dark:text-[#D8D8D8]"
                    >
                      {keyword}
                      {index < 2 && "、"}
                    </span>
                  ))}
                </div>
              </div> : null}
              {queryData?.category ? <div className="flex items-center gap-1">
                <span className="text-[#999999]">
                  {t("assistant.message.steps.questionType")}：
                </span>
                <span className="text-[#333333] dark:text-[#D8D8D8]">
                  {queryData?.category}
                </span>
              </div> :null}
              {queryData?.intent ? <div className="flex items-start gap-1">
                <span className="text-[#999999]">
                  {t("assistant.message.steps.userIntent")}：
                </span>
                <div className="flex-1 text-[#333333] dark:text-[#D8D8D8]">
                  {queryData?.intent}
                </div>
              </div> : null}
              {queryData?.query ? <div className="flex items-start gap-1">
                <span className="text-[#999999]">
                  {t("assistant.message.steps.relatedQuestions")}：
                </span>
                <div className="flex-1 flex flex-col text-[#333333] dark:text-[#D8D8D8]">
                  {queryData?.query?.map((question) => (
                    <span key={question}>- {question}</span>
                  ))}
                </div>
              </div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
