import { Bot, User } from "lucide-react";
import { useState } from "react";

import type { Message } from "./types";
// import { TypingAnimation } from "./TypingAnimation";
import { Markdown } from "./Markdown";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(!isTyping);
  const isAssistant = message._source?.type === "assistant";

  return (
    <div
      className={`py-8 flex ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-3xl px-4 sm:px-6 lg:px-8 flex gap-4 ${
          isAssistant ? "" : "flex-row-reverse"
        }`}
      >
        {/* 头像部分 */}
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

        {/* 消息内容 */}
        <div
          className={`flex-1 space-y-2 ${
            isAssistant ? "text-left" : "text-right"
          }`}
        >
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {isAssistant ? "Assistant" : "You"}
          </p>
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {isAssistant ? (
                <>
                  {/* <TypingAnimation
                    text={message._source?.message || ""}
                    onComplete={() => setIsAnimationComplete(true)}
                  /> */}
                  <Markdown
                    key={isTyping ? "loading" : "done"}
                    content={(message._source?.message || "")}
                    loading={isTyping}
                    onDoubleClickCapture={() => {}}
                  />
                  {isTyping && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-current animate-pulse" />
                  )}
                </>
              ) : (
                message._source?.message || ""
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
