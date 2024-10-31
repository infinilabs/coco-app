import { Bot, User } from "lucide-react";

import type { Message } from "./types";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`py-8 ${
        isAssistant ? "bg-gray-50/50 dark:bg-gray-800/30" : ""
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6">
        <div
          className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
            isAssistant
              ? "bg-gradient-to-br from-green-400 to-emerald-500"
              : "bg-gradient-to-br from-indigo-500 to-purple-500"
          }`}
        >
          {isAssistant ? (
            <Bot className="h-5 w-5 text-white" />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {isAssistant ? "Assistant" : "You"}
          </p>
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
