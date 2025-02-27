import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useState, memo } from "react";
import { useTranslation } from "react-i18next";

import type { Message } from "./types";
import Markdown from "./Markdown";
import { formatThinkingMessage } from "@/utils/index";
import logoImg from "@/assets/icon.svg";
import { SourceResult } from "./SourceResult";
// import { ThinkingSteps } from "./ThinkingSteps";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  isThinkTyping?: boolean;
}

interface SegmentType {
  isSource?: boolean;
  isThinking?: boolean;
  text?: string;
  sourcePrefix?: string;
  sourceData?: any[];
  total?: string;
  sourceType?: string;
  thinkContent?: string;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isTyping,
  isThinkTyping,
}: ChatMessageProps) {
  const { t } = useTranslation();
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  const isAssistant = message._source?.type === "assistant";
  const messageContent = message._source?.message || "";

  const renderContent = () => {
    if (!isAssistant) {
      return (
        <div className="px-3 py-2 bg-white dark:bg-[#202126] rounded-xl border border-black/12 dark:border-black/15 font-normal text-sm text-[#333333] dark:text-[#D8D8D8]">
          {messageContent}
        </div>
      );
    }

    const segments = formatThinkingMessage(messageContent);
    console.log('Source segments:', segments.filter(s => s.isSource));
    
    return (
      <>
        {segments.map((segment: SegmentType, index) => (
          <span key={index}>
            {segment.isSource ? (
              <SourceResult 
                text={segment.text || ''}
                prefix={segment.sourcePrefix}
                data={segment.sourceData}
                total={segment.total}
                type={segment.sourceType}
              />
            ) : segment.isThinking ? (
              <div className="space-y-2 mb-3 w-full">
                <button
                  onClick={() => setIsThinkingExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-xl transition-colors border border-[#E6E6E6] dark:border-[#272626]"
                >
                  {isThinkTyping ? (
                    <>
                      <Brain className="w-4 h-4 animate-pulse text-[#999999]" />
                      <span className="text-xs text-[#999999] italic">
                        {t("assistant.message.thinking")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 text-[#999999]" />
                      <span className="text-xs text-[#999999]">
                        {t("assistant.message.thoughtTime")}
                      </span>
                    </>
                  )}
                  {segment.thinkContent &&
                    (isThinkingExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </button>
                {isThinkingExpanded && segment.thinkContent && (
                  <div className="pl-2 border-l-2 border-[e5e5e5]">
                    <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
                      {segment.thinkContent.split("\n").map(
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
            ) : segment.text ? (
              <div className="space-y-4">
                <Markdown
                  key={`${index}-${isTyping ? "loading" : "done"}`}
                  content={segment.text}
                  loading={isTyping}
                  onDoubleClickCapture={() => {}}
                />
              </div>
            ) : null}
          </span>
        ))}
        {isTyping && (
          <span className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-current animate-pulse" />
        )}
      </>
    );
  };

  return (
    <div
      className={`py-8 flex ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-3xl px-4 sm:px-6 lg:px-8 flex gap-4 ${
          isAssistant ? "" : "flex-row-reverse"
        }`}
      >
        <div
          className={`flex-1 space-y-2 ${
            isAssistant ? "text-left" : "text-right"
          }`}
        >
          <p className="flex items-center gap-4 font-semibold text-sm text-[#333] dark:text-[#d8d8d8]">
            {isAssistant ? (
              <img
                src={logoImg}
                className="w-6 h-6"
                alt={t("assistant.message.logo")}
              />
            ) : null}
            {isAssistant ? t("assistant.message.aiName") : ""}
          </p>
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <div className="text-[#333] dark:text-[#d8d8d8] leading-relaxed">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
