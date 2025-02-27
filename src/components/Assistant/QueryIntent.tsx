import { Brain, ChevronDown, ChevronUp, Loader, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import Markdown from "./Markdown";

interface QueryIntentProps {
  sourceType: string;
  thinkContent: string;
  isThinkTyping?: boolean;
  isTyping?: boolean;
}

export const QueryIntent = ({
  sourceType,
  thinkContent,
  isThinkTyping,
  isTyping,
}: QueryIntentProps) => {
  const { t } = useTranslation();
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  return (
    <div className="space-y-2 mb-3 w-full">
      <button
        onClick={() => setIsThinkingExpanded((prev) => !prev)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-xl transition-colors border border-[#E6E6E6] dark:border-[#272626]"
      >
        {isThinkTyping ? (
          <>
            {sourceType === "think" ? (
              <Brain className="w-4 h-4 animate-pulse text-[#999999]" />
            ) : (
              <Loader className="w-4 h-4 animate-spin text-[#1990FF]" />
            )}
            <span className="text-xs text-[#999999] italic">
              {t(`assistant.message.steps.${sourceType}`)}
            </span>
          </>
        ) : (
          <>
            
            {sourceType === "think" ? (
              <Brain className="w-4 h-4 text-[#999999]" />
            ) : (
              <BadgeCheck className="w-4 h-4 text-[#38C200]" />
            )}
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
            <Markdown
              key={`${sourceType}-${isTyping ? "loading" : "done"}`}
              content={thinkContent}
              loading={isTyping}
              onDoubleClickCapture={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};
