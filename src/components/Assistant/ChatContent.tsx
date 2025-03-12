import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { ChatMessage } from "@/components/ChatMessage";
import { Greetings } from "./Greetings";
import FileList from "@/components/Assistant/FileList";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatStore } from "@/stores/chatStore";
import type { Chat, IChunkData } from "./types";

interface ChatContentProps {
  activeChat?: Chat;
  curChatEnd: boolean;
  query_intent?: IChunkData;
  fetch_source?: IChunkData;
  pick_source?: IChunkData;
  deep_read?: IChunkData;
  think?: IChunkData;
  response?: IChunkData;
  loadingStep?: Record<string, boolean>;
  timedoutShow: boolean;
  errorShow: boolean;
  Question: string;
  handleSendMessage: (content: string, newChat?: Chat) => void;
  getFileUrl: (path: string) => string;
}

export const ChatContent = ({
  activeChat,
  curChatEnd,
  query_intent,
  fetch_source,
  pick_source,
  deep_read,
  think,
  response,
  loadingStep,
  timedoutShow,
  errorShow,
  Question,
  handleSendMessage,
  getFileUrl,
}: ChatContentProps) => {
  const { t } = useTranslation();

  const uploadFiles = useChatStore((state) => state.uploadFiles);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { scrollToBottom } = useChatScroll(messagesEndRef);

  useEffect(() => {
    scrollToBottom();
  }, [
    activeChat?.messages,
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

  return (
    <div className="flex flex-col h-full justify-between overflow-hidden">
      <div className="flex-1 w-full overflow-x-hidden overflow-y-auto border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.15)] custom-scrollbar relative">
        <Greetings />

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
          fetch_source ||
          pick_source ||
          deep_read ||
          think ||
          response) &&
        activeChat?._id ? (
          <ChatMessage
            key={"current"}
            message={{
              _id: "current",
              _source: {
                type: "assistant",
                message: "",
                question: Question,
              },
            }}
            onResend={handleSendMessage}
            isTyping={!curChatEnd}
            query_intent={query_intent}
            fetch_source={fetch_source}
            pick_source={pick_source}
            deep_read={deep_read}
            think={think}
            response={response}
            loadingStep={loadingStep}
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
        {errorShow ? (
          <ChatMessage
            key={"error"}
            message={{
              _id: "error",
              _source: {
                type: "assistant",
                message: t("assistant.chat.error"),
                question: Question,
              },
            }}
            onResend={handleSendMessage}
            isTyping={false}
          />
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {uploadFiles.length > 0 && (
        <div className="max-h-[120px] overflow-auto p-2">
          <FileList getFileUrl={getFileUrl}/>
        </div>
      )}
    </div>
  );
};
