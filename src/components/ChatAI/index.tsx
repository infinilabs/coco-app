import { useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Sidebar } from "./Sidebar";
import type { Message, Chat } from "./types";
import { useTheme } from "../ThemeProvider";
import ChatSwitch from "../SearchChat/ChatSwitch";

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat.messages, isTyping]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
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
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChat(newChat);
    setIsSidebarOpen(false);
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (activeChat.id === chatId) {
      const remainingChats = chats.filter((chat) => chat.id !== chatId);
      if (remainingChats.length > 0) {
        setActiveChat(remainingChats[0]);
      } else {
        createNewChat();
      }
    }
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const updatedChat = {
      ...activeChat,
      title:
        activeChat.messages.length === 1
          ? content.slice(0, 30) + "..."
          : activeChat.title,
      messages: [...activeChat.messages, newMessage],
    };

    setActiveChat(updatedChat);
    setChats((prev) =>
      prev.map((chat) => (chat.id === activeChat.id ? updatedChat : chat))
    );
    setIsTyping(true);

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "This is a simulated response. In a real application, this would be connected to an AI backend.",
        timestamp: new Date(),
      };

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage],
      };

      setActiveChat(finalChat);
      setChats((prev) =>
        prev.map((chat) => (chat.id === activeChat.id ? finalChat : chat))
      );
      setTimeout(() => setIsTyping(false), 500);
    }, 1000);
  };

  return (
    <div className="h-screen flex">
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
          onSelectChat={(chat: any) => {
            setActiveChat(chat);
            setIsSidebarOpen(false);
          }}
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
          {activeChat.messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isTyping={
                isTyping &&
                index === activeChat.messages.length - 1 &&
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
          <ChatInput onSend={handleSendMessage} disabled={isTyping} />
        </div>
      </div>
    </div>
  );
}
