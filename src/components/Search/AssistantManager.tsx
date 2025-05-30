import { useCallback, useRef, useMemo, useState } from "react";
import { cloneDeep, isEmpty } from "lodash-es";

import { useSearchStore } from "@/stores/searchStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";
import type { Assistant } from "@/types/chat";
import { useAppStore } from "@/stores/appStore";

interface AssistantManagerProps {
  isChatMode: boolean;
  handleSubmit: () => void;
  changeInput: (value: string) => void;
}

export function useAssistantManager({
  isChatMode,
  handleSubmit,
  changeInput,
}: AssistantManagerProps) {
  const isTauri = useAppStore((state) => state.isTauri);

  const { goAskAi, setGoAskAi, setAskAiMessage, selectedAssistant } =
    useSearchStore();

  const quickAiAccessAssistant = useExtensionsStore(
    (state) => state.quickAiAccessAssistant
  );

  const askAIRef = useRef<Assistant | null>(null);

  const askAI = useMemo(() => {
    const newAssistant = selectedAssistant ?? quickAiAccessAssistant;
    return newAssistant;
  }, [quickAiAccessAssistant, selectedAssistant]);

  const [assistantDetail, setAssistantDetail] = useState<any>({});

  const assistant_get = useCallback(async () => {
    if (!askAI?.id) return;
    if (isTauri) {
      if (!askAI?.querySource?.id) return;
      const res = await platformAdapter.commands("assistant_get", {
        serverId: askAI?.querySource?.id,
        assistantId: askAI?.id,
      });
      setAssistantDetail(res);
    } else {
      const [error, res]: any = await Get(`/assistant/${askAI?.id}`);
      if (error) {
        console.error("assistant", error);
        return;
      }
      setAssistantDetail(res);
    }
  }, [askAI]);

  const handleAskAi = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    askAIRef.current = cloneDeep(askAI);

    if (!askAIRef.current) return;

    event.preventDefault();

    const { value } = event.currentTarget;

    if (!selectedAssistant && isEmpty(value)) return;

    changeInput("");
    setAskAiMessage(!goAskAi && selectedAssistant ? "" : value);
    setGoAskAi(true);
  };

  const handleKeyDownAutoResizeTextarea = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const { key, shiftKey } = e;

    const { value } = e.currentTarget;

    if (key === "Backspace" && value === "") {
      return setGoAskAi(false);
    }

    if (key === "Tab" && !isChatMode) {
      assistant_get();

      return handleAskAi(e);
    }

    if (key === "Enter" && !shiftKey) {
      if (goAskAi) {
        return handleAskAi(e);
      }

      e.preventDefault();
      handleSubmit();
    }
  };

  return {
    askAI,
    askAIRef,
    assistantDetail,
    handleKeyDownAutoResizeTextarea,
  };
}
