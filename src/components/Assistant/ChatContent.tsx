import { useRef, useEffect, UIEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChatMessage } from "@/components/ChatMessage";
import { Greetings } from "./Greetings";
// import FileList from "@/components/Assistant/FileList";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatStore } from "@/stores/chatStore";
import type { Chat, IChunkData } from "@/types/chat";
import { useConnectStore } from "@/stores/connectStore";
// import SessionFile from "./SessionFile";
import ScrollToBottom from "@/components/Common/ScrollToBottom";

interface ChatContentProps {
  activeChat?: Chat;
  query_intent?: IChunkData;
  tools?: IChunkData;
  fetch_source?: IChunkData;
  pick_source?: IChunkData;
  deep_read?: IChunkData;
  think?: IChunkData;
  response?: IChunkData;
  loadingStep?: Record<string, boolean>;
  timedoutShow: boolean;
  Question: string;
  handleSendMessage: (content: string, newChat?: Chat) => void;
  getFileUrl: (path: string) => string;
  formatUrl?: (data: any) => string;
  curSessionIdRef: React.MutableRefObject<string>;
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
  loadingStep,
  timedoutShow,
  Question,
  handleSendMessage,
  formatUrl,
  curSessionIdRef,
  curIdRef,
}: ChatContentProps) => {
  console.log("curSessionIdRef", curSessionIdRef.current === activeChat?._id);
  // const sessionId = useConnectStore((state) => state.currentSessionId);
  const setCurrentSessionId = useConnectStore((state) => {
    return state.setCurrentSessionId;
  });

  const { t } = useTranslation();

  // const uploadFiles = useChatStore((state) => state.uploadFiles);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { scrollToBottom } = useChatScroll(messagesEndRef);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const visibleStartPage = useConnectStore((state) => state.visibleStartPage);

  const curChatEnd = useChatStore((state) => state.curChatEnd);

  useEffect(() => {
    setIsAtBottom(true);
    setCurrentSessionId(activeChat?._id);
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

  console.log("curIdRef", curIdRef.current);

  return (
    <div className="flex-1 overflow-hidden flex flex-col justify-between relative user-select-text">
      <div
        ref={scrollRef}
        className="flex-1 w-full overflow-x-hidden overflow-y-auto border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.15)] custom-scrollbar relative"
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
          />
        ))}

        {(!curChatEnd ||
          query_intent ||
          tools ||
          fetch_source ||
          pick_source ||
          deep_read ||
          think ||
          response) &&
        activeChat?._source?.id ? (
          <ChatMessage
            key={"current"}
            message={{
              _id: "current",
              _source: {
                type: "assistant",
                assistant_id:
                  allMessages[allMessages.length - 1]?._source?.assistant_id,
                message: "",
                question: Question,
              },
            }}
            onResend={handleSendMessage}
            isTyping={!curChatEnd}
            query_intent={query_intent}
            tools={tools}
            fetch_source={fetch_source}
            pick_source={pick_source}
            deep_read={deep_read}
            think={think}
            response={response}
            loadingStep={loadingStep}
            formatUrl={formatUrl}
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

      {/* {uploadFiles.length > 0 && (
        <div key={sessionId} className="max-h-[120px] overflow-auto p-2">
          <FileList />
        </div>
      )} */}

      {/* {sessionId && <SessionFile sessionId={sessionId} />} */}

      <ScrollToBottom scrollRef={scrollRef} isAtBottom={isAtBottom} />
    </div>
  );
};
