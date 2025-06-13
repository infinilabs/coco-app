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
  inputValue: string;
  handleSubmit: () => void;
  changeInput: (value: string) => void;
}

export function useAssistantManager({
  isChatMode,
  inputValue,
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

  const handleAskAi = () => {
    if (!isTauri) return;

    askAIRef.current = cloneDeep(askAI);

    if (!askAIRef.current) return;

    let value = inputValue.trim();

    if (isEmpty(value)) return;

    if (!goAskAi && selectedAssistant) {
      value = "";
    }

    changeInput("");
    setAskAiMessage(value);
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

    if (key === "Tab" && isTauri) {
      e.preventDefault();

      if (isChatMode) {
        return;
      }

      assistant_get();

      return handleAskAi();
    }

    if (key === "Enter" && !shiftKey && !isChatMode && isTauri) {
      e.preventDefault();

      if (goAskAi) {
        return handleAskAi();
      }

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
