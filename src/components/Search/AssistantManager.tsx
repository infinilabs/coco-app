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

  const assistantRef = useRef<Assistant | null>(null);

  const assistant = useMemo(() => {
    const newAssistant = selectedAssistant ?? quickAiAccessAssistant;
    return newAssistant;
  }, [quickAiAccessAssistant, selectedAssistant]);

  const [assistantDetail, setAssistantDetail] = useState<any>({});

  const assistant_get = useCallback(async () => {
    if (isTauri) {
      const res = await platformAdapter.commands("assistant_get", {
        serverId: assistant?.querySource?.id,
        assistantId: assistant?.id,
      });
      setAssistantDetail(res);
    } else {
      const [error, res]: any = await Get(`/assistant/${assistant?.id}`, {
        id: assistant?.id,
      });
      if (error) {
        console.error("assistant", error);
        return;
      }
      setAssistantDetail(res);
    }
  }, [assistant]);

  const handleAskAi = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    assistantRef.current = cloneDeep(assistant);

    if (!assistantRef.current) return;

    event.preventDefault();

    const { value } = event.currentTarget;

    if (!selectedAssistant && isEmpty(value)) return;

    assistant_get();
    changeInput("");
    setGoAskAi(true);
    setAskAiMessage(!goAskAi && selectedAssistant ? "" : value);
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
    assistant,
    assistantRef,
    assistantDetail,
    handleKeyDownAutoResizeTextarea,
  };
}
