import { memo } from "react";
import { useTranslation } from "react-i18next";

import type { Message } from "./types";
import Markdown from "./Markdown";
import { formatThinkingMessage } from "@/utils/index";
import logoImg from "@/assets/icon.svg";
import { SourceResult } from "./SourceResult";
import { ThinkingSegment } from "./ThinkingSegment";
// import { QueryIntent } from "./QueryIntent";
// import { ThinkingSteps } from "./ThinkingSteps";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  isThinkTyping?: boolean;
}

interface SegmentType {
  isSource?: boolean;
  isThinking?: boolean;
  isQueryIntent?: boolean;
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

    // const sourceSegments = segments.filter((s: SegmentType) => s.isSource);
    // if (sourceSegments.length > 0) {
    //   console.log("Source segments:", sourceSegments);
    // }

    return (
      <>
        {segments.map((segment: SegmentType, index) => (
          <div key={segment?.sourceType || '' + index} className="w-full">
            {/* {segment.isQueryIntent ? (
              <QueryIntent
                sourceType={segment.sourceType || ""}
                thinkContent={segment.thinkContent || ""}
                isThinkTyping={isThinkTyping}
              />
            ) : null} */}
            {segment.isSource ? (
              <SourceResult
                text={segment.text || ""}
                prefix={segment.sourcePrefix}
                data={segment.sourceData}
                total={segment.total}
                type={segment.sourceType}
              />
            ) : null}
            {segment.isThinking ? (
              <ThinkingSegment
                sourceType={segment.sourceType || ""}
                thinkContent={segment.thinkContent || ""}
                isThinkTyping={isThinkTyping}
              />
            ) : null}
            {!segment.isQueryIntent &&
            !segment.isSource &&
            !segment.isThinking &&
            segment.text ? (
              <div className="space-y-4">
                <Markdown
                  key={`${index}-${isTyping ? "loading" : "done"}`}
                  content={segment.text}
                  loading={isTyping}
                  onDoubleClickCapture={() => {}}
                />
              </div>
            ) : null}
          </div>
        ))}
        {isTyping && (
          <div className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-current animate-pulse" />
        )}
      </>
    );
  };

  return (
    <div
      className={`py-8 flex ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`px-4 flex gap-4 ${
          isAssistant ? "w-full" : "flex-row-reverse"
        }`}
      >
        <div
          className={`space-y-2 ${
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
