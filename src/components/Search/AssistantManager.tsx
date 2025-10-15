import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { cloneDeep, isEmpty } from "lodash-es";

import { useSearchStore } from "@/stores/searchStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";
import type { Assistant } from "@/types/chat";
import { useAppStore } from "@/stores/appStore";
import { dispatchEvent, navigateBack } from "@/utils";
import { useKeyPress } from "ahooks";

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
    sourceData,
    setSourceData,
    setVisibleExtensionDetail,
  } = useSearchStore();

  const { quickAiAccessAssistant, disabledExtensions } = useExtensionsStore();

  const askAIRef = useRef<Assistant | null>(null);

  const askAI = useMemo(() => {
    return selectedAssistant ?? quickAiAccessAssistant;
  }, [quickAiAccessAssistant, selectedAssistant]);

  const [assistantDetail, setAssistantDetail] = useState<any>({});

  useEffect(() => {
    if (goAskAi) return;

    askAIRef.current = null;
  }, [goAskAi]);

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

    askAIRef.current ??= cloneDeep(askAI);

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
        e.preventDefault();

        return navigateBack();
      }

      if (key === "Enter" && !shiftKey) {
        e.preventDefault();

        if (isTauri && !isChatMode && goAskAi) {
          if (!isEmpty(value)) {
            e.stopPropagation();
          }

          return handleAskAi();
        }

        handleSubmit();
      }

      if (key === "Home") {
        e.preventDefault();
        return currentTarget.setSelectionRange(0, 0);
      }

      if (key === "End") {
        e.preventDefault();
        const length = currentTarget.value.length;
        return currentTarget.setSelectionRange(length, length);
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

  const clearSearchValue = () => {
    changeInput("");
    setSearchValue("");
  };

  useKeyPress("backspace", () => {
    dispatchEvent("Backspace", 8, "#search-textarea");
  });

  useKeyPress("tab", (event) => {
    if (isChatMode || !isTauri) return;

    event.preventDefault();

    const { visibleExtensionStore } = useSearchStore.getState();

    if (visibleExtensionStore) {
      clearSearchValue();
      return setVisibleExtensionDetail(true);
    }

    if (selectedSearchContent?.id === "Extension Store") {
      clearSearchValue();
      return setVisibleExtensionStore(true);
    }

    if (selectedSearchContent?.category === "View") {
      const onOpened = selectedSearchContent?.on_opened;

      if (onOpened?.Extension?.ty?.View) {
        const { setViewExtensionOpened, setViewExtensionData } =
          useSearchStore.getState();
        const viewData = onOpened.Extension.ty.View;
        const extensionPermission = onOpened.Extension.permission;

        clearSearchValue();
        setViewExtensionOpened([viewData.page, extensionPermission]);
        return setViewExtensionData(selectedSearchContent as any);
      }
    }

    if (selectedSearchContent?.type === "AI Assistant") {
      assistant_get();
      return handleAskAi();
    }

    setSourceData(selectedSearchContent);
  });

  return {
    askAI,
    askAIRef,
    assistantDetail,
    handleKeyDownAutoResizeTextarea,
  };
}
