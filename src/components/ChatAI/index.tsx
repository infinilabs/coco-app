import { useState, useRef, useEffect } from "react";
import { PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";

import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Sidebar } from "./Sidebar";
import type { Chat, Message } from "./types";
import { tauriFetch } from "../../api/tauriFetchClient";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useWindows }  from "../../hooks/useWindows";
import { clientEnv } from "@/utils/env";

interface ChatAIProps {}

export default function ChatAI({}: ChatAIProps) {
  const { closeWin } = useWindows();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [websocketId, setWebsocketId] = useState("");
  const [curMessage, setCurMessage] = useState("");
  const [curChatEnd, setCurChatEnd] = useState(true);

  const [curId, setCurId] = useState("");

  const curChatEndRef = useRef(curChatEnd);
  curChatEndRef.current = curChatEnd;

  const curIdRef = useRef(curId);
  curIdRef.current = curId;
  const { messages, setMessages } = useWebSocket(
    `${clientEnv.COCO_WEBSOCKET_URL}`,
    (msg) => {
      if (msg.includes("websocket-session-id")) {
        const array = msg.split(" ");
        setWebsocketId(array[2]);
      }

      if (msg.includes("PRIVATE")) {
        if (
          msg.includes("assistant finished output") ||
          curChatEndRef.current
        ) {
          setCurChatEnd(true);
        } else {
          const cleanedData = msg.replace(/^PRIVATE /, "");
          try {
            const chunkData = JSON.parse(cleanedData);
            if (chunkData.reply_to_message === curIdRef.current) {
              setCurMessage((prev) => prev + chunkData.message_chunk);
              return chunkData.message_chunk;
            }
          } catch (error) {
            console.error("JSON Parse error:", error);
          }
        }
      }
    }
  );

  // websocket
  useEffect(() => {
    if (messages.length === 0 || !activeChat?._id) return;

    const simulateAssistantResponse = () => {
      console.log("messages", messages);

      const assistantMessage: Message = {
        _id: activeChat._id,
        _source: {
          type: "assistant",
          message: messages,
        },
      };

      const updatedChat = {
        ...activeChat,
        messages: [...(activeChat.messages || []), assistantMessage],
      };
      setMessages("");
      setCurMessage("");
      setActiveChat(updatedChat);
      setTimeout(() => setIsTyping(false), 1000);
    };
    if (curChatEnd) {
      simulateAssistantResponse();
    }
  }, [messages, isTyping, curChatEnd]);

  // getChatHistory
  useEffect(() => {
    getChatHistory();
  }, []);

  const getChatHistory = async () => {
    try {
      const response = await tauriFetch({
        url: "/chat/_history",
        method: "GET",
      });
      console.log("_history", response);
      const hits = response.data?.hits?.hits || [];
      setChats(hits);
      if (hits[0]) {
        onSelectChat(hits[0]);
      } else {
        createNewChat();
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isTyping, curMessage]);

  const createNewChat = async () => {
    try {
      const response = await tauriFetch({
        url: "/chat/_new",
        method: "POST",
      });
      console.log("_new", response);
      const newChat: Chat = response.data;
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat._id !== chatId));
    if (activeChat?._id === chatId) {
      const remainingChats = chats.filter((chat) => chat._id !== chatId);
      if (remainingChats.length > 0) {
        setActiveChat(remainingChats[0]);
      } else {
        createNewChat();
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChat?._id) return;
    try {
      const response = await tauriFetch({
        url: `/chat/${activeChat?._id}/_send`,
        method: "POST",
        headers: {
          "WEBSOCKET-SESSION-ID": websocketId,
        },
        body: JSON.stringify({ message: content }),
      });
      console.log("_send", response, websocketId);
      setCurId(response.data[0]?._id);
      const updatedChat: Chat = {
        ...activeChat,
        messages: [...(activeChat?.messages || []), ...(response.data || [])],
      };

      setActiveChat(updatedChat);
      setIsTyping(true);
      setCurChatEnd(false);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const chatHistory = async (chat: Chat) => {
    try {
      const response = await tauriFetch({
        url: `/chat/${chat._id}/_history`,
        method: "GET",
      });
      console.log("id_history", response);
      const hits = response.data?.hits?.hits || [];
      const updatedChat: Chat = {
        ...chat,
        messages: hits,
      };
      setActiveChat(updatedChat);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

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

  const onSelectChat = async (chat: any) => {
    chatClose();
    try {
      const response = await tauriFetch({
        url: `/chat/${chat._id}/_open`,
        method: "POST",
      });
      console.log("_open", response);
      chatHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const cancelChat = async () => {
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

  async function closeWindow() {
    if (isTauri() && closeWin) {
      await closeWin("chat");
    }
  }

  return (
    <div className="h-screen">
      <div className="h-[100%] flex">
        {/* Sidebar */}
        {isSidebarOpen ? (
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block bg-gray-100 dark:bg-gray-800`}
          >
            {activeChat ? (
              <Sidebar
                chats={chats}
                activeChat={activeChat}
                onNewChat={createNewChat}
                onSelectChat={onSelectChat}
                onDeleteChat={deleteChat}
              />
            ) : null}
          </div>
        ) : null}

        {/* Main content */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900`}>
          <header
            className={`flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800`}
          >
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`rounded-lg transition-colors hover:bg-gray-100 text-gray-600 dark:hover:bg-gray-800 dark:text-gray-300`}
            >
              {isSidebarOpen ? (
                <PanelRightClose className="h-6 w-6" />
              ) : (
                <PanelRightOpen className="h-6 w-6" />
              )}
            </button>

            <X className="cursor-pointer" onClick={closeWindow} />
          </header>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className={`border-t p-4 border-gray-200 dark:border-gray-800`}>
            <ChatInput
              onSend={handleSendMessage}
              disabled={isTyping}
              curChatEnd={curChatEnd}
              disabledChange={() => {
                cancelChat();
                setCurChatEnd(true);
                setIsTyping(false);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
