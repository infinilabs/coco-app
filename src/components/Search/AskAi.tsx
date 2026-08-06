import {
  useAsyncEffect,
  useKeyPress,
  useMount,
  useReactive,
  useUnmount,
} from "ahooks";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { noop } from "lodash-es";
import { nanoid } from "nanoid";

import { ChatMessage } from "../ChatMessage";
import { useSearchStore } from "@/stores/searchStore";
import platformAdapter from "@/utils/platformAdapter";
import useMessageChunkData from "@/hooks/useMessageChunkData";
import { useAppStore } from "@/stores/appStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import {
  DeepResearchPanel,
  type DeepResearchPanelPayload,
} from "@/components/ChatMessage/DeepResearch/DeepResearchPanel";

interface AskAiProps {
  isChatMode: boolean;
  changeMode?: (isChatMode: boolean) => void;
  formatUrl?: (data: any) => string;
}

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

const EMPTY_LOADING_STEP: Record<string, boolean> = {
  query_intent: false,
  tools: false,
  fetch_source: false,
  pick_source: false,
  deep_read: false,
  think: false,
  response: false,
  deepResearch: false,
};

interface State {
  serverId?: string;
  assistantId?: string;
  messageId: string;
  copyButtonId: string;
}

const AskAi: FC<AskAiProps> = (props) => {
  const { isChatMode, changeMode, formatUrl } = props;

  const {
    askAiMessage,
    setGoAskAi,
    setSelectedAssistant,
    setAskAiSessionId,
    selectedAssistant,
    setAskAiServerId,
    setAskAiAssistantId,
  } = useSearchStore();

  const addError = useAppStore((state) => state.addError);

  const {
    data: {
      query_intent,
      tools,
      fetch_source,
      pick_source,
      deep_read,
      think,
      response,
      deepResearch,
      replyEnd,
    },
    handlers,
    clearAllChunkData,
  } = useMessageChunkData();

  useUnmount(() => {
    setSelectedAssistant(void 0);
  });

  const [isTyping, setIsTyping] = useState(false);
  const [deepResearchPanel, setDeepResearchPanel] =
    useState<DeepResearchPanelPayload | null>(null);
  const [loadingStep, setLoadingStep] =
    useState<Record<string, boolean>>(EMPTY_LOADING_STEP);

  const unlisten = useRef<() => void>(noop);
  const sessionIdRef = useRef<string>("");
  const cancelledSessionIdRef = useRef<string>("");

  const { quickAiAccessServer, quickAiAccessAssistant } = useExtensionsStore();

  const state = useReactive<State>({
    messageId: nanoid(),
    copyButtonId: nanoid(),
  });

  const modifierKey = useShortcutsStore((state) => state.modifierKey);

  const continueInChat = useCallback(() => {
    if (isChatMode || isTyping) return;

    const { serverId, assistantId } = state;

    setAskAiServerId(serverId);
    setAskAiSessionId(sessionIdRef.current);
    setAskAiAssistantId(assistantId);

    changeMode?.(true);
    platformAdapter.emitEvent("toggle-to-chat-mode");
  }, [changeMode, isChatMode, isTyping]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.repeat) return;

      const normalizedModifierKey = modifierKey.toLowerCase();
      const modifierKeyPressed =
        (["meta", "command"].includes(normalizedModifierKey) &&
          event.metaKey) ||
        (["ctrl", "control"].includes(normalizedModifierKey) &&
          event.ctrlKey) ||
        (["alt", "option"].includes(normalizedModifierKey) && event.altKey);

      if (!modifierKeyPressed) return;

      event.preventDefault();
      event.stopPropagation();

      continueInChat();
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [continueInChat, modifierKey]);

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
          // console.log("ask_ai", JSON.parse(payload));

          const chunkData = JSON.parse(payload);

          if (chunkData?._id) {
            sessionIdRef.current = chunkData._id;

            return;
          }

          if (sessionIdRef.current !== chunkData.session_id) {
            return;
          }

          if (cancelledSessionIdRef.current === chunkData.session_id) {
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

    await clearAllChunkData();
    sessionIdRef.current = "";
    cancelledSessionIdRef.current = "";
    setDeepResearchPanel(null);

    const { serverId, assistantId } = state;

    Object.assign(state, {
      messageId: nanoid(),
      copyButtonId: nanoid(),
    });

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

  const cancelQuickAiResearch = useCallback(async () => {
    const sessionId = sessionIdRef.current || deepResearch[0]?.session_id;
    const messageId = deepResearch[0]?.message_id || state.messageId;
    const serverId = state.serverId;
    const cancelledPayload = { reason: "user_cancelled" };

    if (sessionId) {
      cancelledSessionIdRef.current = sessionId;
    }

    handlers.deal_reply_end({
      session_id: sessionId || "",
      message_id: messageId,
      message_type: "assistant",
      reply_to_message: deepResearch[0]?.reply_to_message || state.messageId,
      chunk_sequence: Date.now(),
      chunk_type: "reply_end",
      message_chunk: JSON.stringify(cancelledPayload),
    });
    setIsTyping(false);
    setLoadingStep(EMPTY_LOADING_STEP);

    if (!serverId || !sessionId) return;

    try {
      await platformAdapter.commands("cancel_session_chat", {
        serverId,
        sessionId,
        queryParams: {
          message_id: messageId,
        },
      });
    } catch (error) {
      addError(String(error));
    }
  }, [addError, deepResearch, handlers, state.messageId, state.serverId]);

  useKeyPress(
    "enter",
    () => {
      if (isChatMode || isTyping || !state.copyButtonId) return;

      const copyButton = document.getElementById(state.copyButtonId);

      copyButton?.click?.();
    },
    {
      exactMatch: true,
    }
  );

  return (
    askAiMessage && (
      <div className="p-4 h-full relative">
        <div className="h-full px-3 py-4 overflow-auto">
          <div className="mb-4 text-xs text-[#999] font-semibold user-select-text truncate">
            {askAiMessage}
          </div>

          <div className="-my-8 -ml-11 user-select-text">
            <ChatMessage
              key={state.messageId}
              hide_assistant
              message={{
                _id: state.messageId,
                _source: {
                  type: "assistant",
                  message: "",
                  question: askAiMessage,
                  session_id: sessionIdRef.current,
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
              deepResearch={deepResearch}
              replyEnd={replyEnd}
              loadingStep={loadingStep}
              copyButtonId={state.copyButtonId}
              formatUrl={formatUrl}
              onCancel={cancelQuickAiResearch}
              activeDeepResearchViewKey={deepResearchPanel?.viewKey}
              onOpenDeepResearch={setDeepResearchPanel}
              onUpdateDeepResearch={(payload) => {
                setDeepResearchPanel((current) => {
                  return current?.viewKey === payload.viewKey
                    ? payload
                    : current;
                });
              }}
            />
          </div>
        </div>

        {deepResearchPanel && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-sm">
            <DeepResearchPanel
              payload={deepResearchPanel}
              onClose={() => setDeepResearchPanel(null)}
            />
          </div>
        )}
      </div>
    )
  );
};

export default AskAi;
