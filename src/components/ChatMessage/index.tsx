import { memo } from "react";
import { useTranslation } from "react-i18next";

import logoImg from "@/assets/icon.svg";
import type { Message, IChunkData } from "@/components/Assistant/types";
import { QueryIntent } from "./QueryIntent";
import { FetchSource } from "./FetchSource";
import { PickSource } from "./PickSource";
import { DeepRead } from "./DeepRead";
import { Think } from "./Think";
import { MessageActions } from "./MessageActions";
import Markdown from "./Markdown";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  query_intent?: IChunkData;
  fetch_source?: IChunkData;
  pick_source?: IChunkData;
  deep_read?: IChunkData;
  think?: IChunkData;
  response?: IChunkData;
  onResend?: (value: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isTyping,
  query_intent,
  fetch_source,
  pick_source,
  deep_read,
  think,
  response,
  onResend,
}: ChatMessageProps) {
  const { t } = useTranslation();

  const isAssistant = message?._source?.type === "assistant";
  const messageContent = message?._source?.message || "";
  const question = message?._source?.question || "";

  const showActions =
    isTyping === false && (messageContent || response?.message_chunk);

  const renderContent = () => {
    if (!isAssistant) {
      return (
        <div className="px-3 py-2 bg-white dark:bg-[#202126] rounded-xl border border-black/12 dark:border-black/15 font-normal text-sm text-[#333333] dark:text-[#D8D8D8]">
          {messageContent}
        </div>
      );
    }

    return (
      <>
        <QueryIntent ChunkData={query_intent} />
        <FetchSource ChunkData={fetch_source} />
        <PickSource ChunkData={pick_source} />
        <DeepRead ChunkData={deep_read} />
        <Think ChunkData={think} />
        <Markdown
          content={messageContent || response?.message_chunk || ""}
          loading={isTyping}
          onDoubleClickCapture={() => {}}
        />
        {isTyping && (
          <div className="inline-block w-1.5 h-5 ml-0.5 -mb-0.5 bg-[#666666] dark:bg-[#A3A3A3] rounded-sm animate-typing" />
        )}
        {showActions && (
          <MessageActions
            id={message._id}
            content={messageContent || response?.message_chunk || ""}
            question={question}
            onResend={() => {
              onResend && onResend(question);
            }}
          />
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
          className={`space-y-2 ${isAssistant ? "text-left" : "text-right"}`}
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
