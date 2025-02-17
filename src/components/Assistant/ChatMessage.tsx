import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import type { Message } from "./types";
import Markdown from "./Markdown";
import { formatThinkingMessage } from "@/utils/index";
import logoImg from "@/assets/icon.svg";
import { SourceResult } from "./SourceResult";

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
          <p className="flex items-center gap-4 font-semibold text-sm text-[#333] dark:text-[#d8d8d8]">
            {isAssistant ? <img src={logoImg} className="w-6 h-6" /> : null}
            {isAssistant ? "Coco AI" : ""}
          </p>
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <div className="text-[#333] dark:text-[#d8d8d8] leading-relaxed">
              {isAssistant ? (
                <>
                  {segments.map((segment, index) => (
                    <span key={index}>
                      {segment.isThinking || segment.thinkContent ? (
                        <div className="space-y-2 mb-3">
                          {segment.text?.includes("<Source") && (
                            <SourceResult text={segment.text} />
                          )}
                          <button
                            onClick={() =>
                              setIsThinkingExpanded((prev) => !prev)
                            }
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-xl transition-colors border border-[#E6E6E6] dark:border-[#272626]"
                          >
                            {isTyping ? (
                              <>
                                <Brain className="w-4 h-4 animate-pulse text-[#999999]" />
                                <span className="text-xs text-[#999999] italic">
                                  AI is thinking...
                                </span>
                              </>
                            ) : (
                              <>
                                <Brain className="w-4 h-4 text-[#999999]" />
                                <span className="text-xs text-[#999999]">
                                  Thought for {responseTime.toFixed(1)} seconds
                                </span>
                              </>
                            )}
                            {segment.thinkContent &&
                              (isThinkingExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              ))}
                          </button>
                          {isThinkingExpanded && segment.thinkContent && (
                            <div className="pl-2 border-l-2 border-[e5e5e5]">
                              <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
                                {segment.thinkContent.split("\n").map(
                                  (paragraph, idx) =>
                                    paragraph.trim() && (
                                      <p key={idx} className="text-sm">
                                        {paragraph}
                                      </p>
                                    )
                                )}
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
