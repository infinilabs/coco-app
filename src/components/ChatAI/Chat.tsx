import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, PanelLeft } from "lucide-react";
import { motion } from "framer-motion";

import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Sidebar } from "./Sidebar";
import type { Chat, Message } from "./types";
import { useTheme } from "../ThemeProvider";
import { tauriFetch } from "../../api/tauriFetchClient";
import { useWebSocket } from "../../hooks/useWebSocket";
import useWindows from "../../hooks/useWindows";

interface ChatAIProps {
  changeMode: (isChatMode: boolean) => void;
  inputValue: string;
}

export default function ChatAI({ changeMode, inputValue }: ChatAIProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { createWin } = useWindows();

  const [websocketId, setWebsocketId] = useState("");
  const [curMessage, setCurMessage] = useState("");
  const [curChatEnd, setCurChatEnd] = useState(true);
  const { messages, setMessages } = useWebSocket(
    "ws://localhost:2900/ws",
    (msg) => {
      if (msg.includes("websocket_session_id")) {
        const array = msg.split(" ");
        setWebsocketId(array[2]);
      }

      if (msg.includes("PRIVATE")) {
        if (msg.includes("assistant finished output")) {
          setCurChatEnd(true);
        } else {
          const cleanedData = msg.replace(/^PRIVATE /, "");
          try {
            const chunkData = JSON.parse(cleanedData);
            setCurMessage((prev) => prev + chunkData.message_chunk);
            return chunkData.message_chunk;
          } catch (error) {
            console.error("JSON Parse error:", error);
          }
          return "";
        }
      }

      return "";
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
      createNewChat();
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
      setIsSidebarOpen(false);
      //
      console.log(1111, activeChat, inputValue);
      if (inputValue) {
        setTimeout(() => {
          handleSendMessage(inputValue);
        }, 500);
      }
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
          WEBSOCKET_SESSION_ID: websocketId,
        },
        body: JSON.stringify({ message: content }),
      });
      console.log("_send", response, websocketId);
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
      setIsSidebarOpen(false);
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

  async function openChatAI() {
    createWin({
      label: "chat",
      title: "Coco AI",
      dragDropEnabled: true,
      center: true,
      width: 900,
      height: 800,
      alwaysOnTop: true,
      skipTaskbar: true,
      decorations: true,
      closable: true,
      url: "/ui/chat",
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-screen rounded-xl overflow-hidden relative"
    >
      <div className="h-[calc(100%-100px)] flex rounded-xl overflow-hidden">
        {/* Sidebar */}
        {isSidebarOpen ? (
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block ${
              theme === "dark" ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            {activeChat ? (
              <Sidebar
                chats={chats}
                activeChat={activeChat}
                isDark={theme === "dark"}
                onNewChat={createNewChat}
                onSelectChat={onSelectChat}
                onDeleteChat={deleteChat}
              />
            ) : null}
          </div>
        ) : null}

        {/* Main content */}
        <div
          className={`flex-1 flex flex-col rounded-xl overflow-hidden bg-chat_bg_light dark:bg-chat_bg_dark bg-cover`}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
          >
            <header className={`flex items-center justify-between py-2 px-1`}>
              <button
                onClick={() => openChatAI()}
                className={`p-2 rounded-lg transition-colors text-[#333] dark:text-[#d8d8d8]`}
              >
                <PanelLeft className="h-4 w-4" />
              </button>

              {/* <ThemeToggle /> */}

              <button
                onClick={() => createNewChat()}
                className={`p-2 rounded-lg transition-colors text-[#333] dark:text-[#d8d8d8]`}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </header>
          </motion.div>

          {/* Chat messages */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 overflow-y-auto border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.15)] custom-scrollbar"
          >
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
            {isTyping && (
              <div className="flex pt-0 pb-4 pl-20 gap-2 items-center text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </motion.div>
        </div>
      </div>

      {/* Input area */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`mt-2.5 rounded-xl overflow-hidden`}
      >
        <ChatInput
          onSend={handleSendMessage}
          disabled={isTyping}
          disabledChange={(value) => {
            cancelChat();
            setIsTyping(value);
          }}
          changeMode={changeMode}
        />
      </motion.div>
    </motion.div>
  );
}
