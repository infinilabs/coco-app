import { useState } from "react";
import { Menu, MessageSquare, Plus } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import type { Message } from "./types";

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! How can I help you today?",
    timestamp: new Date(),
  },
];

export default function ChatAI() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "This is a simulated response. In a real application, this would be connected to an AI backend.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 dark:bg-gray-950 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg text-gray-300 hover:bg-gray-700/50 transition-colors">
              <MessageSquare className="h-4 w-4" />
              Previous Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <ChatInput onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  );
}
