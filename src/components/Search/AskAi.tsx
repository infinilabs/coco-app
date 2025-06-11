import {
  useAsyncEffect,
  useKeyPress,
  useMount,
  useReactive,
  useUnmount,
} from "ahooks";
import { useEffect, useRef, useState } from "react";
import { noop } from "lodash-es";

import { ChatMessage } from "../ChatMessage";
import { useSearchStore } from "@/stores/searchStore";
import platformAdapter from "@/utils/platformAdapter";
import useMessageChunkData from "@/hooks/useMessageChunkData";
import { useAppStore } from "@/stores/appStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { nanoid } from "nanoid";

interface State {
  serverId?: string;
  assistantId?: string;
}

const AskAi = () => {
  const askAiMessage = useSearchStore((state) => state.askAiMessage);
  const addError = useAppStore((state) => state.addError);
  const setGoAskAi = useSearchStore((state) => state.setGoAskAi);
  const setSelectedAssistant = useSearchStore((state) => {
    return state.setSelectedAssistant;
  });

  const {
    data: {
      query_intent,
      tools,
      fetch_source,
      pick_source,
      deep_read,
      think,
      response,
    },
    handlers,
    clearAllChunkData,
  } = useMessageChunkData();

  useUnmount(() => {
    setSelectedAssistant(void 0);
  });

  const [isTyping, setIsTyping] = useState(false);
  const [loadingStep, setLoadingStep] = useState<Record<string, boolean>>({
    query_intent: false,
    tools: false,
    fetch_source: false,
    pick_source: false,
    deep_read: false,
    think: false,
    response: false,
  });

  const unlisten = useRef<() => void>(noop);
  const sessionIdRef = useRef<string>("");
  const setAskAiSessionId = useSearchStore((state) => state.setAskAiSessionId);
  const quickAiAccessServer = useExtensionsStore((state) => {
    return state.quickAiAccessServer;
  });
  const quickAiAccessAssistant = useExtensionsStore((state) => {
    return state.quickAiAccessAssistant;
  });
  const selectedAssistant = useSearchStore((state) => {
    return state.selectedAssistant;
  });
  const setAskAiServerId = useSearchStore((state) => {
    return state.setAskAiServerId;
  });
  const state = useReactive<State>({});
  const setAskAiAssistantId = useSearchStore((state) => {
    return state.setAskAiAssistantId;
  });
  const modifierKey = useShortcutsStore((state) => state.modifierKey);
  const [copyButtonId, setCopyButtonId] = useState("");

  useEffect(() => {
    if (state.serverId) return;

    const server = selectedAssistant
      ? selectedAssistant.querySource
      : quickAiAccessServer;

    state.serverId = server?.id;
  }, [selectedAssistant, quickAiAccessAssistant]);

  useEffect(() => {
    if (state.assistantId) return;

    const assistant = selectedAssistant ?? quickAiAccessAssistant;

    state.assistantId = assistant?.id;
  }, [selectedAssistant, quickAiAccessAssistant]);

  useMount(async () => {
    try {
      unlisten.current = await platformAdapter.listenEvent(
        "quick-ai-access-client-id",
        ({ payload }) => {
          console.log("ask_ai", JSON.parse(payload));

          const chunkData = JSON.parse(payload);

          if (chunkData?._id) {
            sessionIdRef.current = chunkData._id;

            return;
          }

          if (sessionIdRef.current !== chunkData.session_id) {
            return;
          }

          // If the chunk data does not contain a message_chunk, we ignore it
          if (!chunkData.message_chunk) {
            return;
          }

          setIsTyping(true);

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
            setIsTyping(false);
            return;
          }
        }
      );
    } catch (error) {
      addError(String(error));
    }
  });

  useUnmount(() => {
    setGoAskAi(false);
    unlisten.current();
  });

  useAsyncEffect(async () => {
    if (!askAiMessage || !state.serverId || !state.assistantId) return;

    clearAllChunkData();

    const { serverId, assistantId } = state;
    setCopyButtonId(nanoid());

    try {
      await platformAdapter.invokeBackend("ask_ai", {
        message: askAiMessage,
        serverId,
        assistantId,
        clientId: "quick-ai-access-client-id",
      });
    } catch (error) {
      addError(String(error));
    }
  }, [askAiMessage]);

  useKeyPress(
    `${modifierKey}.enter`,
    async () => {
      if (isTyping) return;

      const { serverId, assistantId } = state;

      await platformAdapter.commands("open_session_chat", {
        serverId,
        sessionId: sessionIdRef.current,
      });

      platformAdapter.emitEvent("toggle-to-chat-mode");

      setAskAiServerId(serverId);
      setAskAiSessionId(sessionIdRef.current);
      setAskAiAssistantId(assistantId);
    },
    {
      exactMatch: true,
    }
  );

  useKeyPress(
    "enter",
    () => {
      const copyButton = document.getElementById(copyButtonId);

      copyButton?.click?.();
    },
    {
      exactMatch: true,
    }
  );

  return (
    askAiMessage && (
      <div className="p-4 h-full">
        <div className="h-full px-3 py-4 overflow-auto">
          <div className="mb-4 text-xs text-[#999] font-semibold user-select-text truncate">
            {askAiMessage}
          </div>

          <div className="-my-8 -ml-11 user-select-text">
            <ChatMessage
              key={"current"}
              hide_assistant
              message={{
                _id: "current",
                _source: {
                  type: "assistant",
                  message: "",
                  question: "",
                },
              }}
              isTyping={isTyping}
              query_intent={query_intent}
              tools={tools}
              fetch_source={fetch_source}
              pick_source={pick_source}
              deep_read={deep_read}
              think={think}
              response={response}
              loadingStep={loadingStep}
              copyButtonId={copyButtonId}
            />
          </div>
        </div>
      </div>
    )
  );
};

export default AskAi;
