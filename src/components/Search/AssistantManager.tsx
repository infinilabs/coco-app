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

  const {
    goAskAi,
    setGoAskAi,
    setAskAiMessage,
    selectedAssistant,
    selectedSearchContent,
    visibleExtensionStore,
    setVisibleExtensionStore,
    setSearchValue,
    visibleExtensionDetail,
    setVisibleExtensionDetail,
    sourceData,
    setSourceData,
  } = useSearchStore();

  const { quickAiAccessAssistant, disabledExtensions } = useExtensionsStore();

  const askAIRef = useRef<Assistant | null>(null);

  const askAI = useMemo(() => {
    const newAssistant = selectedAssistant ?? quickAiAccessAssistant;
    return newAssistant;
  }, [quickAiAccessAssistant, selectedAssistant]);

  const [assistantDetail, setAssistantDetail] = useState<any>({});

  const assistant_get = useCallback(async () => {
    if (!askAI?.id) return;
    if (disabledExtensions.includes("QuickAIAccess")) return;

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
  }, [askAI?.id, askAI?.querySource?.id, disabledExtensions]);

  const handleAskAi = useCallback(() => {
    if (!isTauri) return;

    if (disabledExtensions.includes("QuickAIAccess")) return;

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
  }, [disabledExtensions, askAI, inputValue, goAskAi, selectedAssistant]);

  const handleKeyDownAutoResizeTextarea = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const { key, shiftKey, currentTarget } = e;
      const { value } = currentTarget;

      if (key === "Backspace" && value === "") {
        if (goAskAi) {
          return setGoAskAi(false);
        }

        if (visibleExtensionDetail) {
          return setVisibleExtensionDetail(false);
        }

        if (visibleExtensionStore) {
          return setVisibleExtensionStore(false);
        }

        if (sourceData) {
          return setSourceData(void 0);
        }
      }

      if (key === "Tab" && !isChatMode && isTauri) {
        e.preventDefault();

        if (visibleExtensionStore) return;

        if (selectedSearchContent?.id === "Extension Store") {
          changeInput("");
          setSearchValue("");
          return setVisibleExtensionStore(true);
        }

        assistant_get();
        return handleAskAi();
      }

      if (key === "Enter" && !shiftKey && !isChatMode && isTauri) {
        e.preventDefault();

        goAskAi ? handleAskAi() : handleSubmit();
      }
    },
    [
      isChatMode,
      goAskAi,
      assistant_get,
      handleAskAi,
      handleSubmit,
      selectedSearchContent,
      visibleExtensionStore,
      visibleExtensionDetail,
      sourceData,
    ]
  );

  return {
    askAI,
    askAIRef,
    assistantDetail,
    handleKeyDownAutoResizeTextarea,
  };
}
