import { memo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import logoImg from "@/assets/icon.svg";
import type { Message, IChunkData } from "@/components/Assistant/types";
import { QueryIntent } from "./QueryIntent";
import { CallTools } from "./CallTools";
import { FetchSource } from "./FetchSource";
import { PickSource } from "./PickSource";
import { DeepRead } from "./DeepRead";
import { Think } from "./Think";
import { MessageActions } from "./MessageActions";
import Markdown from "./Markdown";
import { SuggestionList } from "./SuggestionList";
import { UserMessage } from "./UserMessage";
import { useConnectStore } from "@/stores/connectStore";
import FontIcon from "@/components/Common/Icons/FontIcon";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  query_intent?: IChunkData;
  tools?: IChunkData;
  fetch_source?: IChunkData;
  pick_source?: IChunkData;
  deep_read?: IChunkData;
  think?: IChunkData;
  response?: IChunkData;
  onResend?: (value: string) => void;
  loadingStep?: Record<string, boolean>;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isTyping,
  query_intent,
  tools,
  fetch_source,
  pick_source,
  deep_read,
  think,
  response,
  onResend,
  loadingStep,
}: ChatMessageProps) {
  const { t } = useTranslation();

  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const assistantList = useConnectStore((state) => state.assistantList);
  const [assistant, setAssistant] = useState<any>({});

  const isAssistant = message?._source?.type === "assistant";
  const assistant_id = message?._source?.assistant_id;

  useEffect(() => {
    let target = currentAssistant;
    if (isAssistant && assistant_id && Array.isArray(assistantList)) {
      const found = assistantList.find((item) => item._id === assistant_id);
      if (found) {
        target = found;
      }
    }
    setAssistant(target);
  }, [isAssistant, assistant_id, assistantList, currentAssistant]);

  const messageContent = message?._source?.message || "";
  const details = message?._source?.details || [];
  const question = message?._source?.question || "";

  const showActions =
    isTyping === false && (messageContent || response?.message_chunk);

  const [suggestion, setSuggestion] = useState<string[]>([]);
  const visibleStartPage = useConnectStore((state) => state.visibleStartPage);

  const getSuggestion = (suggestion: string[]) => {
    setSuggestion(suggestion);
  };

  const renderContent = () => {
    if (!isAssistant) {
      return <UserMessage messageContent={messageContent} />;
    }

    return (
      <>
        <QueryIntent
          Detail={details.find((item) => item.type === "query_intent")}
          ChunkData={query_intent}
          getSuggestion={getSuggestion}
          loading={loadingStep?.query_intent}
        />

        <CallTools
          Detail={details.find((item) => item.type === "tools")}
          ChunkData={tools}
          loading={loadingStep?.tools}
        />

        <FetchSource
          Detail={details.find((item) => item.type === "fetch_source")}
          ChunkData={fetch_source}
          loading={loadingStep?.fetch_source}
        />
        <PickSource
          Detail={details.find((item) => item.type === "pick_source")}
          ChunkData={pick_source}
          loading={loadingStep?.pick_source}
        />
        <DeepRead
          Detail={details.find((item) => item.type === "deep_read")}
          ChunkData={deep_read}
          loading={loadingStep?.deep_read}
        />
        <Think
          Detail={details.find((item) => item.type === "think")}
          ChunkData={think}
          loading={loadingStep?.think}
        />
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
        {!isTyping && (
          <SuggestionList
            suggestions={suggestion}
            onSelect={(text) => onResend && onResend(text)}
          />
        )}
      </>
    );
  };

  return (
    <div
      className={clsx(
        "py-8 flex",
        [isAssistant ? "justify-start" : "justify-end"],
        {
          hidden: visibleStartPage,
        }
      )}
    >
      <div
        className={`px-4 flex gap-4 ${
          isAssistant ? "w-full" : "flex-row-reverse"
        }`}
      >
        <div
          className={`w-full space-y-2 ${
            isAssistant ? "text-left" : "text-right"
          }`}
        >
          <div className="w-full flex items-center gap-1 font-semibold text-sm text-[#333] dark:text-[#d8d8d8]">
            {isAssistant ? (
              <div className="w-6 h-6 flex justify-center items-center rounded-full bg-white border border-[#E6E6E6]">
                {assistant?._source?.icon?.startsWith("font_") ? (
                  <FontIcon name={assistant._source.icon} className="w-4 h-4" />
                ) : (
                  <img
                    src={logoImg}
                    className="w-4 h-4"
                    alt={t("assistant.message.logo")}
                  />
                )}
              </div>
            ) : null}
            {isAssistant ? assistant?._source?.name || "Coco AI" : ""}
          </div>
          <div className="w-full prose dark:prose-invert prose-sm max-w-none">
            <div className="w-full pl-7 text-[#333] dark:text-[#d8d8d8] leading-relaxed">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
