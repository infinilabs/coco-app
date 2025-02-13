import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import type { Message } from "./types";
import Markdown from "./Markdown";
import { formatThinkingMessage } from "@/utils/index";

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const [responseTime, setResponseTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);
  const isAssistant = message._source?.type === "assistant";
  const segments = formatThinkingMessage(message._source.message);

  useEffect(() => {
    if (isTyping && !hasStartedRef.current) {
      startTimeRef.current = Date.now();
      hasStartedRef.current = true;
    } else if (!isTyping && hasStartedRef.current && startTimeRef.current) {
      const duration = (Date.now() - startTimeRef.current) / 1000;
      setResponseTime(duration);
      hasStartedRef.current = false;
    }
  }, [isTyping]);

  return (
    <div
      className={`py-8 flex ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-3xl px-4 sm:px-6 lg:px-8 flex gap-4 ${
          isAssistant ? "" : "flex-row-reverse"
        }`}
      >
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
                  {segments.map((segment, index) => (
                    <span key={index}>
                      {segment.isThinking || segment.thinkContent ? (
                        <div className="space-y-2 mb-3">
                          <button 
                            onClick={() => setIsThinkingExpanded(prev => !prev)}
                            className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100/50 dark:bg-gray-800/50 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            {isTyping ? (
                              <>
                                <Brain className="w-4 h-4 animate-pulse text-gray-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  AI is thinking...
                                </span>
                              </>
                            ) : (
                              <>
                                <Brain className="w-4 h-4 text-gray-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Time to answer: {responseTime.toFixed(1)}s
                                </span>
                              </>
                            )}
                            {segment.thinkContent && (
                              isThinkingExpanded ? 
                                <ChevronUp className="w-4 h-4" /> : 
                                <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          {isThinkingExpanded && segment.thinkContent && (
                            <div className="pl-2 border-l-2 border-[e5e5e5]">
                              <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
                                {segment.thinkContent.split('\n').map((paragraph, idx) => (
                                  paragraph.trim() && (
                                    <p key={idx} className="text-sm">
                                      {paragraph}
                                    </p>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : segment.text ? (
                        <div className="space-y-4">
                          <Markdown
                            key={`${index}-${isTyping ? "loading" : "done"}`}
                            content={segment.text}
                            loading={isTyping}
                            onDoubleClickCapture={() => {}}
                          />
                        </div>
                      ) : null}
                    </span>
                  ))}
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
