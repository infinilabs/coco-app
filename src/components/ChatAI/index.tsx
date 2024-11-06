import { useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Sidebar } from "./Sidebar";
import type { Chat } from "./types";
import { useTheme } from "../ThemeProvider";
import ChatSwitch from "../SearchChat/ChatSwitch";
import { Footer } from "../SearchChat/Footer";
import { tauriFetch } from "../../api/tauriFetchClient";
import { useWebSocket } from "../../hooks/useWebSocket";

const INITIAL_CHAT: Chat = {
  id: "1",
  title: "New Chat",
  messages: [
    {
      id: "1",
      role: "assistant",
      content: "Hello! How can I help you today?",
      timestamp: new Date(),
    },
  ],
  createdAt: new Date(),
  _index: ".infini_session",
  _type: "_doc",
  _id: "csk30fjq50k7l4akku9g",
  _score: 1.0,
  _source: {
    id: "csk30fjq50k7l4akku9g",
    created: "2024-11-04T10:23:58.980669+08:00",
    updated: "2024-11-04T10:23:58.980678+08:00",
    status: "active",
  },
};

interface ChatAIProps {
  changeMode: (isChatMode: boolean) => void;
}

export default function ChatAI({ changeMode }: ChatAIProps) {
  const [chats, setChats] = useState<Chat[]>([INITIAL_CHAT]);
  const [activeChat, setActiveChat] = useState<Chat>(INITIAL_CHAT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const { messages, connected, sendMessage } = useWebSocket(
    "ws://localhost:2900/ws",
    (msg) => {
      if (msg.indexOf("PRIVATE") > -1) {
        const array = msg.split(" ");
        return array[1]?.trim() || "";
      }
      return "";
    }
  );
  console.log("useWebSocket", messages, connected, sendMessage);
  useEffect(() => {
    // Simulate assistant response
    setTimeout(() => {
      // const assistantMessage: Message = {
      //   id: (Date.now() + 1).toString(),
      //   role: "assistant",
      //   content:
      //     "This is a simulated response. In a real application, this would be connected to an AI backend.",
      //   timestamp: new Date(),
      // };
      const finalChat = {
        ...activeChat,
        messages: messages,
      };

      setActiveChat(finalChat);
      setChats((prev) =>
        prev.map((chat) => (chat._id === activeChat._id ? finalChat : chat))
      );
      setTimeout(() => setIsTyping(false), 500);
    }, 1000);
  }, [messages]);
  useEffect(() => {
    getChatHistory();
  }, []);

  const getChatHistory = async () => {
    try {
      const response = await tauriFetch({
        url: "/chat/_history",
        method: "GET",
      });

      console.log(response);
      // mock response.data
      // const data = {
      //   took: 997,
      //   timed_out: false,
      //   _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      //   hits: {
      //     total: { value: 1, relation: "eq" },
      //     max_score: 1.0,
      //     hits: [
      //       {
      //         _index: ".infini_session",
      //         _type: "_doc",
      //         _id: "csk30fjq50k7l4akku9g",
      //         _score: 1.0,
      //         _source: {
      //           id: "csk30fjq50k7l4akku9g",
      //           created: "2024-11-04T10:23:58.980669+08:00",
      //           updated: "2024-11-04T10:23:58.980678+08:00",
      //           status: "active",
      //         },
      //       },
      //     ],
      //   },
      // };
      const hits = response.data?.hits?.hits || [];
      setChats(hits);
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
  }, [activeChat.messages, isTyping]);

  const createNewChat = async () => {
    try {
      const response = await tauriFetch({
        url: "/chat/_new",
        method: "POST",
      });

      console.log("_new", response);
      // mock response.data
      // const data = {
      //   _id: "csk30fjq50k7l4akku9g",
      //   _source: {
      //     id: "csk30fjq50k7l4akku9g",
      //     created: "2024-11-04T10:23:58.980669+08:00",
      //     updated: "2024-11-04T10:25:20.541856+08:00",
      //     status: "active",
      //   },
      //   found: true,
      // };
      const newChat: Chat = response.data;
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);
      setIsSidebarOpen(false);
    } catch (error) {
      //   {
      //     "status": 502,
      //     "statusText": "Bad Gateway",
      //     "headers": [
      //         [
      //             "connection",
      //             "close"
      //         ],
      //         [
      //             "content-length",
      //             "0"
      //         ]
      //     ],
      //     "url": "http://localhost:2900/chat/_new",
      //     "rid": 1404502625
      // }
      console.error("Failed to fetch user data:", error);
    }
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat._id !== chatId));
    if (activeChat._id === chatId) {
      const remainingChats = chats.filter((chat) => chat.id !== chatId);
      if (remainingChats.length > 0) {
        setActiveChat(remainingChats[0]);
      } else {
        createNewChat();
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      const response = await tauriFetch({
        url: `/chat/${activeChat._id}/_send`,
        method: "POST",
        headers: {
          WEBSOCKET_SESSION_ID: activeChat._source?.session_id || "",
        },
        body: JSON.stringify({ message: content }),
      });

      console.log("_send", response);
      // const data = [{
      //   "_id": "csk325rq50k85fc5u0j0",
      //   "_source": {
      //     "id": "csk325rq50k85fc5u0j0",
      //     "type": "user",
      //     "created": "2024-11-04T10:27:35.211502+08:00",
      //     "updated": "2024-11-04T10:27:35.211508+08:00",
      //     "session_id": "csk30fjq50k7l4akku9g",
      //     "message": "Hello"
      //   },
      //   "result": "created"
      // }]
      const newMessage: any = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      const updatedChat = {
        ...activeChat,
        title:
          activeChat.messages?.length === 1
            ? content.slice(0, 30) + "..."
            : activeChat.title,
        messages: [...(activeChat.messages || []), newMessage],
      };

      setActiveChat(updatedChat);
      setChats((prev) =>
        prev.map((chat) => (chat._id === activeChat._id ? updatedChat : chat))
      );
      setIsTyping(true);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const chatHistory = async (id: string) => {
    try {
      const response = await tauriFetch({
        url: `/chat/${id}/_history`,
        method: "GET",
      });
      console.log("id_history", response);
      // mock response.data
      // const data = {
      //   took: 4,
      //   timed_out: false,
      //   _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      //   hits: {
      //     total: { value: 0, relation: "eq" },
      //     max_score: null,
      //     hits: [],
      //   },
      // };

      // const hits = response.data.hits.hits;
      // setChats(hits);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const chatClose = async () => {
    try {
      const response = await tauriFetch({
        url: `/chat/${activeChat._id}/_close`,
        method: "POST",
      });
      console.log("_close", response);
      // mock response.data
      // const data = {
      //   _id: "csk30fjq50k7l4akku9g",
      //   _source: {
      //     id: "csk30fjq50k7l4akku9g",
      //     created: "2024-11-04T10:23:58.980669+08:00",
      //     updated: "2024-11-04T10:28:47.461033+08:00",
      //     status: "closed",
      //   },
      //   found: true,
      // };
      console.info(`/chat/${activeChat._id}/_close Success!`);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const onSelectChat = async (chat: any) => {
    try {
      chatClose();
      const response = await tauriFetch({
        url: `/chat/${chat._id}/_open`,
        method: "POST",
      });
      console.log("_open", response);
      // mock response.data
      // const data = {
      //   _id: "csk30fjq50k7l4akku9g",
      //   _source: {
      //     id: "csk30fjq50k7l4akku9g",
      //     created: "2024-11-04T10:23:58.980669+08:00",
      //     updated: "2024-11-04T10:25:20.541856+08:00",
      //     status: "active",
      //   },
      //   found: true,
      // };
      chatHistory(chat._id);
      setActiveChat(chat);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  return (
    <div className="h-screen pb-8">
      {/* <div className="bg-black">
        <h1>WebSocket 状态: {connected ? "已连接" : "未连接"}</h1>
        <button onClick={() => sendMessage("Hello from button!")}>
          发送消息
        </button>
        <div>
          <h2>接收的消息:</h2>
          {messages.map((msg, index) => (
            <p key={index}>{index + ": " + msg}</p>
          ))}
        </div>
      </div> */}
      <div className="h-[100%] flex">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block ${
            theme === "dark" ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <Sidebar
            chats={chats}
            activeChat={activeChat}
            isDark={theme === "dark"}
            onNewChat={createNewChat}
            onSelectChat={onSelectChat}
            onDeleteChat={deleteChat}
          />
        </div>

        {/* Main content */}
        <div
          className={`flex-1 flex flex-col ${
            theme === "dark" ? "bg-gray-900" : "bg-white"
          }`}
        >
          {/* Header */}
          <header
            className={`flex items-center justify-between p-4 border-b ${
              theme === "dark" ? "border-gray-800" : "border-gray-200"
            }`}
          >
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "hover:bg-gray-800 text-gray-300"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <ChatSwitch isChat={true} changeMode={changeMode} />
            </div>

            <ThemeToggle />
          </header>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto">
            {activeChat.messages?.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isTyping={
                  isTyping &&
                  index === (activeChat.messages?.length || 0) - 1 &&
                  message.role === "assistant"
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className={`border-t p-4 ${
              theme === "dark" ? "border-gray-800" : "border-gray-200"
            }`}
          >
            <ChatInput
              onSend={handleSendMessage}
              disabled={isTyping}
              disabledChange={setIsTyping}
            />
          </div>
        </div>
      </div>

      <Footer isChat={true} />
    </div>
  );
}
