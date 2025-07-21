import { useCallback, useRef } from "react";

import type { IChunkData, Chat } from "@/types/chat";
import { useConnectStore } from "@/stores/connectStore";

export function useMessageHandler(
  curIdRef: React.MutableRefObject<string>,
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
  }
) {
  const messageTimeoutRef = useRef<NodeJS.Timeout>();
  const connectionTimeout = useConnectStore((state) => state.connectionTimeout);
  const inThinkRef = useRef<boolean>(false);

  const dealMsg = useCallback(
    (msg: string) => {
      console.log("msg", msg);

      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }

      messageTimeoutRef.current = setTimeout(() => {
        console.log("AI response timeout");
        setTimedoutShow(true);
        onCancel();
      }, (connectionTimeout ?? 120) * 1000);

      try {
        const chunkData = JSON.parse(msg);

        if (chunkData.reply_to_message !== curIdRef.current) return;

        setLoadingStep(() => ({
          query_intent: false,
          tools: false,
          fetch_source: false,
          pick_source: false,
          deep_read: false,
          think: false,
          response: false,
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
        } else if (chunkData.chunk_type === "reply_end") {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }
          setCurChatEnd(true);
          console.log("AI finished output");
          return;
        }
      } catch (error) {
        setCurChatEnd(true);
        console.error("parse error:", error);
      }
    },
    [
      onCancel,
      setCurChatEnd,
      setTimedoutShow,
      curIdRef.current,
      connectionTimeout,
    ]
  );

  return {
    dealMsg,
  };
}
