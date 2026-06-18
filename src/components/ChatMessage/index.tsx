import { memo, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import logoImg from "@/assets/icon.svg";
import type { Message, IChunkData } from "@/types/chat";
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
import { DeepResearch } from "./DeepResearch";
import { useConnectStore } from "@/stores/connectStore";
import { useThemeStore } from "@/stores/themeStore";
import FontIcon from "@/components/Common/Icons/FontIcon";
import type { DeepResearchPanelPayload } from "./DeepResearch/DeepResearchPanel";

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
  deepResearch?: IChunkData[];
  replyEnd?: IChunkData[];
  onResend?: (value: string) => void;
  onCancel?: () => void;
  loadingStep?: Record<string, boolean>;
  hide_assistant?: boolean;
  rootClassName?: string;
  actionClassName?: string;
  actionIconSize?: number;
  copyButtonId?: string;
  formatUrl?: (data: any) => string;
  activeDeepResearchViewKey?: string;
  onOpenDeepResearch?: (payload: DeepResearchPanelPayload) => void;
  onUpdateDeepResearch?: (payload: DeepResearchPanelPayload) => void;
  onRequestDeepResearchCancel?: () => void;
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
  deepResearch = [],
  replyEnd = [],
  onResend,
  onCancel,
  loadingStep,
  hide_assistant = false,
  rootClassName,
  actionClassName,
  actionIconSize,
  copyButtonId,
  formatUrl,
  activeDeepResearchViewKey,
  onOpenDeepResearch,
  onUpdateDeepResearch,
  onRequestDeepResearchCancel,
}: ChatMessageProps) {
  const { t } = useTranslation();

  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const assistantList = useConnectStore((state) => state.assistantList);
  const isDark = useThemeStore((state) => state.isDark);
  const [assistant, setAssistant] = useState<any>({});

  const isAssistant = message?._source?.type === "assistant";
  const assistant_id = message?._source?.assistant_id;
  const assistant_item = message?._source?.assistant_item;

  useEffect(() => {
    if (assistant_item) {
      setAssistant(assistant_item);
      return;
    }

    if (isAssistant && assistant_id && Array.isArray(assistantList)) {
      setAssistant(
        assistantList.find((item) => item._id === assistant_id) ?? {}
      );
      return;
    }

    setAssistant(currentAssistant);
  }, [
    isAssistant,
    assistant_item,
    assistant_id,
    assistantList,
    currentAssistant,
  ]);

  const messageContent = message?._source?.message || "";
  const attachments = message?._source?.attachments ?? [];
  const details = message?._source?.details || [];
  const question = message?._source?.question || "";
  const payload = message?._source?.payload;
  const sessionId = message?._source?.session_id || deepResearch[0]?.session_id;
  const messageId = message?._id || deepResearch[0]?.message_id;

  const deepResearchDetail = details.find(
    (item) => item.type === "deep_research"
  );

  const endChunk = useMemo(() => {
    const endDetail = details.find((item) => item.type === "reply_end");
    if (endDetail) {
      return endDetail;
    }
    const last = replyEnd.length > 0 ? replyEnd[replyEnd.length - 1] : undefined;
    let endPayload;
    try {
      endPayload =
        last && last.message_chunk ? JSON.parse(last.message_chunk) : undefined;
    } catch (e) {
      // ignore malformed end chunk payload
    }
    return last ? { type: last.chunk_type, payload: endPayload } : undefined;
  }, [details, replyEnd]);

  const isCancelled = endChunk?.payload?.reason === "user_cancelled";
  const isError = endChunk?.payload?.reason === "error";
  const isTimeout = endChunk?.payload?.reason === "timeout";
  const isDeepResearching = !!deepResearchDetail || deepResearch.length > 0;

  const showActions =
    isTyping === false && (messageContent || response?.message_chunk);

  const [suggestion, setSuggestion] = useState<string[]>([]);

  const getSuggestion = (suggestion: string[]) => {
    setSuggestion(suggestion);
  };

  const renderContent = () => {
    if (!isAssistant) {
      return <UserMessage message={messageContent} attachments={attachments} />;
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
          formatUrl={formatUrl}
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
        <DeepResearch
          detail={deepResearchDetail}
          endChunk={endChunk}
          ChunkData={deepResearch}
          question={question}
          formatUrl={formatUrl}
          theme={isDark ? "dark" : "light"}
          payload={payload}
          onCancel={onCancel}
          sessionId={sessionId}
          messageId={messageId}
          activeDetailViewKey={activeDeepResearchViewKey}
          onOpenDetail={onOpenDeepResearch}
          onUpdateDetail={onUpdateDeepResearch}
          onRequestCancel={onRequestDeepResearchCancel}
        />
        {isCancelled && (
          <div className="mt-[16px] text-[14px] leading-[20px] text-[#999]">
            {isDeepResearching
              ? t("deepResearch.status.cancelled")
              : t("labels.cancelled")}
          </div>
        )}
        {isError && (
          <div className="mt-[16px] px-[12px] rounded-[8px] border border-[#F0F0F0] dark:border-[#303030]">
            <div className="h-[38px] leading-[38px] text-[12px] text-[#333] dark:text-[#E5E7EB] font-[700]">
              {isDeepResearching
                ? t("deepResearch.status.error")
                : t("labels.error")}
            </div>
            {endChunk?.payload?.error && (
              <div className="py-[8px] border-t border-[#F0F0F0] dark:border-[#303030] leading-[16px] text-[12px] text-[#333] dark:text-[#E5E7EB]">
                {endChunk.payload.error}
              </div>
            )}
          </div>
        )}
        {isTimeout && (
          <div className="mt-[16px] px-[12px] rounded-[8px] border border-[#F0F0F0] dark:border-[#303030]">
            <div className="h-[38px] leading-[38px] text-[12px] text-[#333] dark:text-[#E5E7EB] font-[700]">
              {endChunk?.payload?.type
                ? t(`labels.timeout_${endChunk.payload.type}`)
                : isDeepResearching
                ? t("deepResearch.status.timeout")
                : t("labels.timeout")}
            </div>
            {endChunk?.payload?.error && (
              <div className="py-[8px] border-t border-[#F0F0F0] dark:border-[#303030] leading-[16px] text-[12px] text-[#333] dark:text-[#E5E7EB]">
                {endChunk.payload.error}
              </div>
            )}
          </div>
        )}
        {deepResearch.length === 0 && isTyping && (
          <div className="inline-block w-1.5 h-5 ml-0.5 -mb-0.5 bg-[#666666] dark:bg-[#A3A3A3] rounded-sm animate-typing" />
        )}
        {showActions && (
          <MessageActions
            id={message._id}
            content={messageContent || response?.message_chunk || ""}
            question={question}
            actionClassName={actionClassName}
            actionIconSize={actionIconSize}
            copyButtonId={copyButtonId}
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
        "w-full py-8 flex",
        [isAssistant ? "justify-start" : "justify-end"],
        rootClassName
      )}
    >
      <div
        className={`w-full px-4 flex gap-4 ${
          isAssistant ? "w-full" : "flex-row-reverse"
        }`}
      >
        <div
          className={`w-full space-y-2 ${
            isAssistant ? "text-left" : "text-right"
          }`}
        >
          {!hide_assistant && (
            <div className="w-full flex items-center gap-1 font-semibold text-sm text-[#333] dark:text-[#d8d8d8]">
              {isAssistant ? (
                <div className="w-6 h-6 flex justify-center items-center rounded-full bg-white border border-[#E6E6E6]">
                  {assistant?._source?.icon?.startsWith("font_") ? (
                    <FontIcon
                      name={assistant._source.icon}
                      className="w-4 h-4"
                    />
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
          )}
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
