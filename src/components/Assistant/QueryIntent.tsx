import {
  ChevronDown,
  ChevronUp,
  Loader,
  BadgeCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface QueryIntentProps {
  sourceType: string;
  thinkContent: string;
  isThinkTyping?: boolean;
}

export const QueryIntent = ({ sourceType, thinkContent }: QueryIntentProps) => {
  const { t } = useTranslation();
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  const [isTyping, setIsTyping] = useState(false);
  const [prevContent, setPrevContent] = useState(thinkContent);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isCompleted && thinkContent !== prevContent) {
      setIsTyping(true);
      setPrevContent(thinkContent);
    } else if (thinkContent === prevContent && isTyping) {
      setIsTyping(false);
      setIsCompleted(true);
    }
  }, [thinkContent, prevContent, isTyping, isCompleted]);

  return (
    <div className="space-y-2 mb-3 w-full">
      <button
        onClick={() => setIsThinkingExpanded((prev) => !prev)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-xl transition-colors border border-[#E6E6E6] dark:border-[#272626]"
      >
        {isTyping ? (
          <>
            <Loader className="w-4 h-4 animate-spin text-[#1990FF]" />
            <span className="text-xs text-[#999999] italic">
              {t(`assistant.message.steps.${sourceType}`)}
            </span>
          </>
        ) : (
          <>
            <BadgeCheck className="w-4 h-4 text-[#38C200]" />
            <span className="text-xs text-[#999999]">
              {sourceType === "think"
                ? t("assistant.message.steps.thoughtTime")
                : t(`assistant.message.steps.${sourceType}`)}
            </span>
          </>
        )}
        {thinkContent &&
          (isThinkingExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          ))}
      </button>
      {isThinkingExpanded && thinkContent && (
        <div className="pl-2 border-l-2 border-[e5e5e5]">
          <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
            <div className="mb-4 space-y-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[#999999]">关键词：</span>
                <div className="flex flex-wrap gap-1">
                  {["Easysearch"].map((keyword, index) => (
                    <span
                      key={index}
                      className="text-[#333333] dark:text-[#D8D8D8]"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#999999]">问题类型：</span>
                <span className="text-[#333333] dark:text-[#D8D8D8]">
                  Seeking Information
                </span>
              </div>
              <div className="flex items-start gap-1">
                <span className="text-[#999999]">用户意图：</span>
                <div className="flex-1 text-[#333333] dark:text-[#D8D8D8]">
                  了解 Easysearch 的相关信息
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
