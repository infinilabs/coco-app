import { useCallback, useRef } from "react";

import type { IChunkData, Chat } from "@/types/chat";
import { useConnectStore } from "@/stores/connectStore";

const DEEP_RESEARCH_CHUNK_TYPES = [
  "research_planner_start",
  "research_planner_progress",
  "research_planner_end",
  "research_researcher_start",
  "research_researcher_step_start",
  "research_researcher_step_end",
  "research_researcher_end",
  "research_reporter_start",
  "research_reporter_end",
];

export function useMessageHandler(
  curIdRef: React.MutableRefObject<string>,
  curSessionIdRef: React.MutableRefObject<string>,
  setCurChatEnd: (value: boolean) => void,
  setTimedoutShow: (value: boolean) => void,
  onCancel: (chat?: Chat) => void,
  setLoadingStep: (
    value:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void,
  handlers: {
    deal_query_intent: (data: IChunkData) => void;
    deal_tools: (data: IChunkData) => void;
    deal_fetch_source: (data: IChunkData) => void;
    deal_pick_source: (data: IChunkData) => void;
    deal_deep_read: (data: IChunkData) => void;
    deal_think: (data: IChunkData) => void;
    deal_response: (data: IChunkData) => void;
    deal_deep_research: (data: IChunkData) => void;
    deal_reply_end: (data: IChunkData) => void;
  },
  onReplyEnd?: (data: IChunkData) => void
) {
  const messageTimeoutRef = useRef<NodeJS.Timeout>();
  const responseTimeout = useConnectStore((state) => state.responseTimeout);
  const inThinkRef = useRef<boolean>(false);
  const inDeepResearchRef = useRef<boolean>(false);

  const dealMsg = useCallback(
    (msg: string) => {
      try {
        const chunkData = JSON.parse(msg);

        if (chunkData.reply_to_message !== curIdRef.current) return;
        if (chunkData.session_id !== curSessionIdRef.current) return;

        // 重置当前消息的响应看门狗
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
        }

        if (chunkData.chunk_type === "reply_start") {
          inDeepResearchRef.current = false;
        }
        if (DEEP_RESEARCH_CHUNK_TYPES.includes(chunkData.chunk_type)) {
          inDeepResearchRef.current = true;
        }

        // 深度研究单步耗时长，chunk 间隔可能远超 responseTimeout；
        // 交由后端 reply_end(timeout/error/completed) 或用户 Stop 终止，避免短超时误杀。
        if (!inDeepResearchRef.current && chunkData.chunk_type !== "reply_end") {
          messageTimeoutRef.current = setTimeout(() => {
            setTimedoutShow(true);
            onCancel();
          }, (responseTimeout ?? 120) * 1000);
        }

        setLoadingStep(() => ({
          query_intent: false,
          tools: false,
          fetch_source: false,
          pick_source: false,
          deep_read: false,
          think: false,
          response: false,
          deepResearch: false,
          [chunkData.chunk_type]: true,
        }));

        if (chunkData.chunk_type === "query_intent") {
          handlers.deal_query_intent(chunkData);
        } else if (chunkData.chunk_type === "tools") {
          handlers.deal_tools(chunkData);
        } else if (chunkData.chunk_type === "fetch_source") {
          handlers.deal_fetch_source(chunkData);
        } else if (chunkData.chunk_type === "pick_source") {
          handlers.deal_pick_source(chunkData);
        } else if (chunkData.chunk_type === "deep_read") {
          handlers.deal_deep_read(chunkData);
        } else if (chunkData.chunk_type === "think") {
          handlers.deal_think(chunkData);
        } else if (chunkData.chunk_type === "response") {
          const message_chunk = chunkData.message_chunk;
          if (typeof message_chunk === "string") {
            if (
              message_chunk.includes("\u003cthink\u003e") ||
              message_chunk.includes("<think>")
            ) {
              inThinkRef.current = true;
              return;
            } else if (
              message_chunk.includes("\u003c/think\u003e") ||
              message_chunk.includes("</think>")
            ) {
              inThinkRef.current = false;
              return;
            }

            if (inThinkRef.current) {
              handlers.deal_think({ ...chunkData, chunk_type: "think" });
            } else {
              handlers.deal_response(chunkData);
            }
          }
        } else if (
          DEEP_RESEARCH_CHUNK_TYPES.includes(chunkData.chunk_type)
        ) {
          handlers.deal_deep_research(chunkData);
        } else if (chunkData.chunk_type === "reply_end") {
          handlers.deal_reply_end(chunkData);
          inDeepResearchRef.current = false;
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }
          setCurChatEnd(true);
          onReplyEnd?.(chunkData);
          // console.log("AI finished output");
          return;
        }
      } catch (error) {
        setCurChatEnd(true);
        console.error("parse error:", error);
      }
    },
    [onCancel, onReplyEnd, setCurChatEnd, setTimedoutShow, responseTimeout]
  );

  return {
    dealMsg,
  };
}
