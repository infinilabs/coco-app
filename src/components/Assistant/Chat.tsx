import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { MessageSquarePlus, PanelLeft } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { debounce } from "lodash-es";

import { ChatMessage } from "./ChatMessage";
import type { Chat, Message } from "./types";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useChatStore } from "@/stores/chatStore";
import { useWindows } from "@/hooks/useWindows";
import { clientEnv } from "@/utils/env";

interface ChatAIProps {
  isTransitioned: boolean;
  changeInput: (val: string) => void;
  isSearchActive?: boolean;
  isDeepThinkActive?: boolean;
}

export interface ChatAIRef {
  init: (value: string) => void;
  cancelChat: () => void;
  connected: boolean;
  reconnect: () => void;
}

const ChatAI = memo(
  forwardRef<ChatAIRef, ChatAIProps>(
    (
      { isTransitioned, changeInput, isSearchActive, isDeepThinkActive },
      ref
    ) => {
      const { t } = useTranslation();
      useImperativeHandle(ref, () => ({
        init: init,
        cancelChat: cancelChat,
        connected: connected,
        reconnect: reconnect,
      }));

      const { createWin } = useWindows();

      const { curChatEnd, setCurChatEnd, setConnected } = useChatStore();

      const [activeChat, setActiveChat] = useState<Chat>();
      const [isTyping, setIsTyping] = useState(false);
      const [timedoutShow, setTimedoutShow] = useState(false);
      const messagesEndRef = useRef<HTMLDivElement>(null);

      const [websocketId, setWebsocketId] = useState("");
      const [curMessage, setCurMessage] = useState("");
      const [curId, setCurId] = useState("");

      const websocketIdRef = useRef("");

      const curChatEndRef = useRef(curChatEnd);
      curChatEndRef.current = curChatEnd;

      const curIdRef = useRef(curId);
      curIdRef.current = curId;

      const handleMessageChunk = useCallback((chunk: string) => {
        setCurMessage((prev) => prev + chunk);
      }, []);

      const messageTimeoutRef = useRef<NodeJS.Timeout>();

      const dealMsg = useCallback((msg: string) => {
        // console.log("msg:", msg);
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
        }

        if (msg.includes("websocket-session-id")) {
          const array = msg.split(" ");
          setWebsocketId(array[2]);
          websocketIdRef.current = array[2];
          return "";
        } else if (msg.includes("PRIVATE")) {
          messageTimeoutRef.current = setTimeout(() => {
            if (!curChatEnd && isTyping) {
              console.log("AI response timeout");
              setTimedoutShow(true);
              cancelChat();
            }
          }, 30000);

          if (msg.includes("assistant finished output")) {
            if (messageTimeoutRef.current) {
              clearTimeout(messageTimeoutRef.current);
            }
            // console.log("AI finished output");
            simulateAssistantResponse();
            setCurChatEnd(true);
          } else {
            const cleanedData = msg.replace(/^PRIVATE /, "");
            try {
              console.log("cleanedData", cleanedData);
              const chunkData = JSON.parse(cleanedData);
              if (chunkData.reply_to_message === curIdRef.current) {
                handleMessageChunk(chunkData.message_chunk);
                setMessages((prev) => prev + chunkData.message_chunk);
                return chunkData.message_chunk;
              }
            } catch (error) {
              console.error("parse error:", error);
            }
          }
        }
      }, []);

      const { messages, setMessages, connected, reconnect } = useWebSocket(
        clientEnv.COCO_WEBSOCKET_URL,
        dealMsg
      );

      const simulateAssistantResponse = useCallback(() => {
        if (!activeChat?._id) return;

        // console.log("curMessage", curMessage);

        const assistantMessage: Message = {
          _id: activeChat._id,
          _source: {
            type: "assistant",
            message: curMessage || messages,
          },
        };

        const updatedChat = {
          ...activeChat,
          messages: [...(activeChat.messages || []), assistantMessage],
        };

        // console.log("updatedChat:", updatedChat);
        setActiveChat(updatedChat);
        setMessages("");
        setCurMessage("");
        setIsTyping(false);
      }, [activeChat?._id, curMessage, messages]);

      useEffect(() => {
        if (curChatEnd) {
          simulateAssistantResponse();
        }
      }, [curChatEnd]);

      useEffect(() => {
        setConnected(connected);
      }, [connected]);

      const scrollToBottom = useCallback(
        debounce(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }, 100),
        []
      );

      useEffect(() => {
        scrollToBottom();
      }, [activeChat?.messages, isTyping, curMessage]);

      const createNewChat = useCallback(async (value: string = "") => {
        chatClose();
        try {
          const response = await tauriFetch({
            url: "/chat/_new",
            method: "POST",
          });
          console.log("_new", response);
          const newChat: Chat = response.data;
          
          setActiveChat(newChat);
          handleSendMessage(value, newChat);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      }, []);

      const init = (value: string) => {
        if (!curChatEnd) return;
        if (!activeChat?._id) {
          createNewChat(value);
        } else {
          handleSendMessage(value);
        }
      };

      const handleSendMessage = useCallback(async (content: string, newChat?: Chat) => {
        newChat = newChat || activeChat;
        if (!newChat?._id || !content) return;
        setTimedoutShow(false);
        try {
          const response = await tauriFetch({
            url: `/chat/${newChat?._id}/_send?search=${isSearchActive}&deep_thinking=${isDeepThinkActive}`,
            method: "POST",
            headers: {
               "WEBSOCKET-SESSION-ID": websocketIdRef.current || websocketId
            },
            body: JSON.stringify({ message: content }),
          });
          console.log("_send", response, websocketId);
          setCurId(response.data[0]?._id);

          const updatedChat: Chat = {
            ...newChat,
            messages: [...(newChat?.messages || []), ...(response.data || [])],
          };

          changeInput("");
          // console.log("updatedChat2", updatedChat);
          setActiveChat(updatedChat);
          setIsTyping(true);
          setCurChatEnd(false);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      }, [JSON.stringify(activeChat), websocketId]);

      const chatClose = async () => {
        if (!activeChat?._id) return;
        try {
          const response = await tauriFetch({
            url: `/chat/${activeChat._id}/_close`,
            method: "POST",
          });
          console.log("_close", response);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      const cancelChat = async () => {
        if (curMessage || messages) {
          simulateAssistantResponse();
        }

        setCurChatEnd(true);
        setIsTyping(false);
        if (!activeChat?._id) return;
        try {
          const response = await tauriFetch({
            url: `/chat/${activeChat._id}/_cancel`,
            method: "POST",
          });

          console.log("_cancel", response);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      async function openChatAI() {
        if (isTauri()) {
          createWin &&
            createWin({
              label: "chat",
              title: "Coco Chat",
              dragDropEnabled: true,
              center: true,
              width: 1000,
              height: 800,
              alwaysOnTop: false,
              skipTaskbar: false,
              decorations: true,
              closable: true,
              url: "/ui/chat",
            });
        }
      }

      useEffect(() => {
        return () => {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }
          chatClose();
          setMessages("");
          setCurMessage("");
          setActiveChat(undefined);
          setIsTyping(false);
          setCurChatEnd(true);
          scrollToBottom.cancel();
        };
      }, []);

      if (!isTransitioned) return null;

      return (
        <div
          data-tauri-drag-region
          className={`h-[500px] flex flex-col rounded-xl overflow-hidden`}
        >
          <header
            data-tauri-drag-region
            className={`flex items-center justify-between py-2 px-1`}
          >
            <button
              onClick={() => openChatAI()}
              className={`p-2 rounded-lg transition-colors text-[#333] dark:text-[#d8d8d8]`}
            >
              <PanelLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => {
                createNewChat();
              }}
              className={`p-2 rounded-lg transition-colors text-[#333] dark:text-[#d8d8d8]`}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </header>

          {/* Chat messages */}
          <div className="w-full overflow-x-hidden overflow-y-auto border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.15)] custom-scrollbar relative">
            <ChatMessage
              key={"greetings"}
              message={{
                _id: 'greetings',
                _source: {
                  type: 'assistant',
                  message: t("assistant.chat.greetings")
                }
              }}
              isTyping={false}
            />

            {activeChat?.messages?.map((message, index) => (
              <ChatMessage
                key={message._id + index}
                message={message}
                isTyping={
                  isTyping &&
                  index === (activeChat.messages?.length || 0) - 1 &&
                  message._source?.type === "assistant"
                }
              />
            ))}

            {!curChatEnd && activeChat?._id ? (
              <ChatMessage
                key={"last"}
                message={{
                  _id: activeChat?._id,
                  _source: {
                    type: "assistant",
                    message: curMessage,
                  },
                }}
                isTyping={!curChatEnd}
              />
            ) : null}

            {timedoutShow ? <ChatMessage
              key={"timedout"}
              message={{
                _id: 'timedout',
                _source: {
                  type: 'assistant',
                  message: t("assistant.chat.timedout")
                }
              }}
              isTyping={false}
            />: null}

            <div ref={messagesEndRef} />
          </div>
        </div>
      );
    }
  )
);

export default ChatAI;
