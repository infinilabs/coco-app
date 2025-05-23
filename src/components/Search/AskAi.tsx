import { useAsyncEffect, useKeyPress, useMount, useUnmount } from "ahooks";
import { useEffect, useRef, useState } from "react";

import { ChatMessage } from "../ChatMessage";
import { ASK_AI_CLIENT_ID, COPY_BUTTON_ID } from "@/constants";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import platformAdapter from "@/utils/platformAdapter";
import useMessageChunkData from "@/hooks/useMessageChunkData";
import { useAppStore } from "@/stores/appStore";
import { isMac } from "@/utils/platform";
import { noop } from "lodash-es";
import { useExtensionsStore } from "@/stores/extensionsStore";

const AskAi = () => {
  const askAiMessage = useSearchStore((state) => state.askAiMessage);
  const currentService = useConnectStore((state) => state.currentService);
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
  const assistantRef = useRef<any>(null);

  useEffect(() => {
    if (!quickAiAccessAssistant) return;

    assistantRef.current = selectedAssistant ?? quickAiAccessAssistant;
  }, [selectedAssistant, quickAiAccessAssistant]);

  useMount(async () => {
    try {
      unlisten.current = await platformAdapter.listenEvent(
        ASK_AI_CLIENT_ID,
        ({ payload }) => {
          console.log("ask_ai", JSON.parse(payload));

          setIsTyping(true);

          const chunkData = JSON.parse(payload);

          if (chunkData?._id) {
            sessionIdRef.current = chunkData._id;

            return;
          }

          if (sessionIdRef.current !== chunkData.session_id) {
            return;
          }

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
    if (!askAiMessage || !currentService?.id || !assistantRef.current) return;

    clearAllChunkData();

    try {
      await platformAdapter.invokeBackend("ask_ai", {
        message: askAiMessage,
        serverId: selectedAssistant
          ? currentService?.id
          : quickAiAccessServer.id,
        assistantId: assistantRef.current.id,
        clientId: ASK_AI_CLIENT_ID,
      });
    } catch (error) {
      addError(String(error));
    }
  }, [askAiMessage, assistantRef]);

  useKeyPress("enter", async (event) => {
    const { metaKey, ctrlKey } = event;

    if (isTyping) return;

    if ((isMac && metaKey) || (!isMac && ctrlKey)) {
      await platformAdapter.commands("open_session_chat", {
        serverId: currentService?.id,
        sessionId: sessionIdRef.current,
      });

      platformAdapter.emitEvent("toggle-to-chat-mode");

      return setAskAiSessionId(sessionIdRef.current);
    }

    const copyButton = document.getElementById(COPY_BUTTON_ID);

    copyButton?.click();
  });

  return (
    askAiMessage && (
      <div className="p-4 h-full">
        <div className="h-full px-3 py-4 overflow-auto">
          <div className="text-xs text-[#999] font-semibold user-select-text truncate">
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
            />
          </div>
        </div>
      </div>
    )
  );
};

export default AskAi;
