import type { Message } from "./types";
import Markdown from "./Markdown";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
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
        {/* <div
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
        </div> */}

        <div
          className={`flex-1 space-y-2 ${
            isAssistant ? "text-left" : "text-right"
          }`}
        >
          <p className="font-semibold text-sm text-[#333] dark:text-[#d8d8d8]">
            {isAssistant ? "Summary" : ""}
          </p>
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <div className="text-[#333] dark:text-[#d8d8d8] leading-relaxed">
              {isAssistant ? (
                <>
                  <Markdown
                    key={isTyping ? "loading" : "done"}
                    content={message._source?.message || ""}
                    loading={isTyping}
                    onDoubleClickCapture={() => {}}
                  />
                  {isTyping && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-current animate-pulse" />
                  )}
                </>
              ) : (
                <div className="px-3 py-2 bg-white dark:bg-[#202126] rounded-xl border border-black/12 dark:border-black/15 font-normal text-sm text-[#333333] dark:text-[#D8D8D8]">
                  {message._source?.message || ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
