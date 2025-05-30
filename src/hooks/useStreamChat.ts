import { useAppStore } from "@/stores/appStore";
import { EventPayloads } from "@/types/platform";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useMount, useReactive, useUnmount } from "ahooks";
import { noop } from "lodash-es";
import { useRef, useState } from "react";
import useMessageChunkData from "./useMessageChunkData";

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
}

export const useStreamChat = (options: Options) => {
  const { message, clientId, server, assistant, setVisible } = options;

  const unlistenRef = useRef<() => void>(noop);
  const addError = useAppStore((state) => state.addError);
  const state = useReactive<State>({
    isTyping: true,
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
          console.log(clientId, JSON.parse(payload));

          const chunkData = JSON.parse(payload);

          if (chunkData?._id) {
            state.sessionId = chunkData._id;

            return;
          }

          if (state.sessionId !== chunkData.session_id) {
            return;
          }

          // If the chunk data does not contain a message_chunk, we ignore it
          if (chunkData.message_chunk) {
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
          } else if (chunkData.chunk_type === "reply_end") {
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

    clearAllChunkData();

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
