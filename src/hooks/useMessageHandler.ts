import { useCallback, useRef } from "react";

import type { IChunkData, Chat } from "@/components/Assistant/types";

export function useMessageHandler(
  curIdRef: React.MutableRefObject<string>,
  setCurChatEnd: (value: boolean) => void,
  setTimedoutShow: (value: boolean) => void,
  onCancel: (chat?: Chat) => void,
  setLoadingStep: (value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void,
  handlers: {
    deal_query_intent: (data: IChunkData) => void;
    deal_fetch_source: (data: IChunkData) => void;
    deal_pick_source: (data: IChunkData) => void;
    deal_deep_read: (data: IChunkData) => void;
    deal_think: (data: IChunkData) => void;
    deal_response: (data: IChunkData) => void;
  }
) {
  const messageTimeoutRef = useRef<NodeJS.Timeout>();

  const dealMsg = useCallback(
    (msg: string) => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }

      if (!msg.includes("PRIVATE")) return;

      messageTimeoutRef.current = setTimeout(() => {
        console.log("AI response timeout");
        setTimedoutShow(true);
        onCancel();
      }, 120000);

      const cleanedData = msg.replace(/^PRIVATE /, "");
      try {
        const chunkData = JSON.parse(cleanedData);

        if (chunkData.reply_to_message !== curIdRef.current) return;

        setLoadingStep(() => ({
          query_intent: false,
          fetch_source: false,
          pick_source: false,
          deep_read: false,
          think: false,
          response: false,
          [chunkData.chunk_type]: true,
        }));

        if (chunkData.chunk_type === "query_intent") {
          handlers.deal_query_intent(chunkData);
        } else if (chunkData.chunk_type === "fetch_source") {
          handlers.deal_fetch_source(chunkData);
        } else if (chunkData.chunk_type === "pick_source") {
          handlers.deal_pick_source(chunkData);
        } else if (chunkData.chunk_type === "deep_read") {
          handlers.deal_deep_read(chunkData);
        } else if (chunkData.chunk_type === "think") {
          handlers.deal_think(chunkData);
        } else if (chunkData.chunk_type === "response") {
          handlers.deal_response(chunkData);
        } else if (chunkData.chunk_type === "reply_end") {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }
          setCurChatEnd(true);
          console.log("AI finished output");
          return;
        }
      } catch (error) {
        console.error("parse error:", error);
      }
    },
    [onCancel, setCurChatEnd, setTimedoutShow, curIdRef.current]
  );

  return {
    dealMsg,
    messageTimeoutRef
  };
}