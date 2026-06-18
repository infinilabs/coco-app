import { useRef, useEffect, UIEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "@/components/ChatMessage";
import { Greetings } from "./Greetings";
import AttachmentList from "@/components/Assistant/AttachmentList";
import { useChatScroll } from "@/hooks/useChatScroll";
import type { Chat, IChunkData } from "@/types/chat";
import { useConnectStore } from "@/stores/connectStore";
// import SessionFile from "./SessionFile";
import ScrollToBottom from "@/components/Common/ScrollToBottom";
import { useChatStore } from "@/stores/chatStore";
import { useWebConfigStore } from "@/stores/webConfigStore";
import { useAppStore } from "@/stores/appStore";
import { NoResults } from "../Common/UI/NoResults";
import {
  DeepResearchPanel,
  type DeepResearchPanelPayload,
} from "@/components/ChatMessage/DeepResearch/DeepResearchPanel";

interface ChatContentProps {
  activeChat?: Chat;
  query_intent?: IChunkData;
  tools?: IChunkData;
  fetch_source?: IChunkData;
  pick_source?: IChunkData;
  deep_read?: IChunkData;
  think?: IChunkData;
  response?: IChunkData;
  deepResearch?: IChunkData[];
  replyEnd?: IChunkData[];
  loadingStep?: Record<string, boolean>;
  timedoutShow: boolean;
  Question: string;
  handleSendMessage: (content: string, newChat?: Chat) => void;
  onCancel?: () => void;
  onRequestDeepResearchCancel?: () => void;
  getFileUrl: (path: string) => string;
  formatUrl?: (data: any) => string;
  curIdRef: React.MutableRefObject<string>;
}

export const ChatContent = ({
  activeChat,
  query_intent,
  tools,
  fetch_source,
  pick_source,
  deep_read,
  think,
  response,
  deepResearch,
  replyEnd,
  loadingStep,
  timedoutShow,
  Question,
  handleSendMessage,
  onCancel,
  onRequestDeepResearchCancel,
  formatUrl,
}: ChatContentProps) => {
  const { t } = useTranslation();

  const currentSessionId = useConnectStore((state) => state.currentSessionId);
  const setCurrentSessionId = useConnectStore(
    (state) => state.setCurrentSessionId
  );
  const visibleStartPage = useConnectStore((state) => state.visibleStartPage);

  const uploadAttachments = useChatStore((state) => state.uploadAttachments);
  const curChatEnd = useChatStore((state) => state.curChatEnd);
  const [deepResearchPanel, setDeepResearchPanel] =
    useState<DeepResearchPanelPayload | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { scrollToBottom } = useChatScroll(messagesEndRef);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    setIsAtBottom(true);
    setCurrentSessionId(activeChat?._id);
  }, [activeChat?._id]);

  useEffect(() => {
    setDeepResearchPanel(null);
  }, [activeChat?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [
    activeChat?._id,
    query_intent?.message_chunk,
    fetch_source?.message_chunk,
    pick_source?.message_chunk,
    deep_read?.message_chunk,
    think?.message_chunk,
    response?.message_chunk,
    deepResearch?.length,
    curChatEnd,
  ]);

  useEffect(() => {
    return () => {
      scrollToBottom.cancel();
    };
  }, [scrollToBottom]);

  const allMessages = activeChat?.messages || [];

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } =
      event.currentTarget as HTMLDivElement;

    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setIsAtBottom(isAtBottom);
  };

  const { isTauri } = useAppStore();
  const { disabled } = useWebConfigStore();

  const closeDeepResearchPanel = () => setDeepResearchPanel(null);

  return (
    <div className="flex-1 overflow-hidden flex flex-col justify-between relative user-select-text">
      {!isTauri && disabled ? (
        <NoResults />
      ) : (
        <>
          <div className="flex-1 min-h-0 relative border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.15)]">
            <div
              ref={scrollRef}
              className="h-full w-full overflow-x-hidden overflow-y-auto custom-scrollbar relative"
              onScroll={handleScroll}
            >
              {(!activeChat || activeChat?.messages?.length === 0) &&
                !visibleStartPage && <Greetings />}

              {activeChat?.messages?.map((message, index) => (
                <ChatMessage
                  key={message._id + index}
                  message={message}
                  isTyping={false}
                  onResend={handleSendMessage}
                  formatUrl={formatUrl}
                  activeDeepResearchViewKey={deepResearchPanel?.viewKey}
                  onOpenDeepResearch={setDeepResearchPanel}
                  onRequestDeepResearchCancel={onRequestDeepResearchCancel}
                  onUpdateDeepResearch={(payload) => {
                    setDeepResearchPanel((current) => {
                      return current?.viewKey === payload.viewKey
                        ? payload
                        : current;
                    });
                  }}
                />
              ))}

              {(!curChatEnd ||
                query_intent ||
                tools ||
                fetch_source ||
                pick_source ||
                deep_read ||
                think ||
                response ||
                (deepResearch && deepResearch.length > 0)) &&
              activeChat?._source?.id ? (
                <ChatMessage
                  key={"current"}
                  message={{
                    _id: "current",
                    _source: {
                      type: "assistant",
                      assistant_id:
                        allMessages[allMessages.length - 1]?._source
                          ?.assistant_id,
                      message: "",
                      question: Question,
                      session_id: activeChat?._id,
                    },
                  }}
                  onResend={handleSendMessage}
                  onCancel={onCancel}
                  onRequestDeepResearchCancel={onRequestDeepResearchCancel}
                  isTyping={!curChatEnd}
                  query_intent={query_intent}
                  tools={tools}
                  fetch_source={fetch_source}
                  pick_source={pick_source}
                  deep_read={deep_read}
                  think={think}
                  response={response}
                  deepResearch={deepResearch}
                  replyEnd={replyEnd}
                  loadingStep={loadingStep}
                  formatUrl={formatUrl}
                  activeDeepResearchViewKey={deepResearchPanel?.viewKey}
                  onOpenDeepResearch={setDeepResearchPanel}
                  onUpdateDeepResearch={(payload) => {
                    setDeepResearchPanel((current) => {
                      return current?.viewKey === payload.viewKey
                        ? payload
                        : current;
                    });
                  }}
                />
              ) : null}

              {timedoutShow ? (
                <ChatMessage
                  key={"timedout"}
                  message={{
                    _id: "timedout",
                    _source: {
                      type: "assistant",
                      message: t("assistant.chat.timedout"),
                      question: Question,
                    },
                  }}
                  onResend={handleSendMessage}
                  isTyping={false}
                />
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            {deepResearchPanel && (
              <div className="absolute inset-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-sm">
                <DeepResearchPanel
                  payload={deepResearchPanel}
                  onClose={closeDeepResearchPanel}
                />
              </div>
            )}
          </div>

          {uploadAttachments.length > 0 && (
            <div
              key={currentSessionId}
              className="max-h-[120px] overflow-auto p-2"
            >
              <AttachmentList />
            </div>
          )}

          {/* {currentSessionId && <SessionFile sessionId={currentSessionId} />} */}

          <ScrollToBottom scrollRef={scrollRef} isAtBottom={isAtBottom} />
        </>
      )}
    </div>
  );
};
