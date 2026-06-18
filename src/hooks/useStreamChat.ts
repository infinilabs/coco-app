import { useAsyncEffect, useMount, useReactive, useUnmount } from "ahooks";
import { noop } from "lodash-es";
import { useRef, useState } from "react";

import { useAppStore } from "@/stores/appStore";
import { EventPayloads } from "@/types/platform";
import platformAdapter from "@/utils/platformAdapter";
import useMessageChunkData from "./useMessageChunkData";
import { nanoid } from "nanoid";

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

interface Options {
  message: string;
  clientId: keyof EventPayloads;
  server?: any;
  assistant?: any;
  setVisible: (visible: boolean) => void;
}

interface State {
  sessionId?: string;
  isTyping?: boolean;
  messageId: string;
}

export const useStreamChat = (options: Options) => {
  const { message, clientId, server, assistant, setVisible } = options;

  const unlistenRef = useRef<() => void>(noop);
  const { addError } = useAppStore();
  const state = useReactive<State>({
    isTyping: true,
    messageId: nanoid(),
  });
  const [loadingStep, setLoadingStep] = useState<Record<string, boolean>>({
    query_intent: false,
    tools: false,
    fetch_source: false,
    pick_source: false,
    deep_read: false,
    think: false,
    response: false,
  });

  const {
    data: chunkData,
    handlers,
    clearAllChunkData,
  } = useMessageChunkData();

  useMount(async () => {
    try {
      unlistenRef.current = await platformAdapter.listenEvent(
        clientId,
        ({ payload }) => {
          //console.log(clientId, JSON.parse(payload));

          const chunkData = JSON.parse(payload);

          if (chunkData?._id) {
            state.sessionId = chunkData._id;

            return;
          }

          if (state.sessionId !== chunkData.session_id) {
            return;
          }

          // If the chunk data does not contain a message_chunk, we ignore it
          if (chunkData.message_chunk.trim()) {
            setVisible(true);
          }

          state.isTyping = true;

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
            handlers.deal_response(chunkData);
          } else if (
            DEEP_RESEARCH_CHUNK_TYPES.includes(chunkData.chunk_type)
          ) {
            handlers.deal_deep_research(chunkData);
          } else if (chunkData.chunk_type === "reply_end") {
            handlers.deal_reply_end(chunkData);
            console.log("AI finished output");
            state.isTyping = false;
            return;
          }
        }
      );
    } catch (error) {
      addError(String(error));
    }
  });

  useAsyncEffect(async () => {
    if (!message || !server || !assistant) return;

    await clearAllChunkData();

    state.messageId = nanoid();

    try {
      await platformAdapter.invokeBackend("ask_ai", {
        message,
        clientId,
        serverId: server.id,
        assistantId: assistant.id,
      });
    } catch (error) {
      addError(String(error));
    }
  }, [message, server, assistant]);

  useUnmount(() => {
    unlistenRef.current();
  });

  return {
    ...state,
    chunkData,
    loadingStep,
  };
};
