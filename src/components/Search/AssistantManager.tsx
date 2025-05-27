import { useCallback, useRef, useMemo, useState } from "react";
import { cloneDeep, isEmpty } from "lodash-es";

import { useSearchStore } from "@/stores/searchStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import platformAdapter from "@/utils/platformAdapter";
import { Get } from "@/api/axiosRequest";

export function useAssistantManager({
  isTauri,
  isChatMode,
  handleSubmit,
  goAskAi,
  setGoAskAi,
  setAskAiMessage,
  changeInput,
}: any) {
  const selectedAssistant = useSearchStore((state) => state.selectedAssistant);
  const quickAiAccessAssistant = useExtensionsStore(
    (state) => state.quickAiAccessAssistant
  );

  const assistantRef = useRef<unknown>(null);

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
      setAssistantDetail(res)
    } else {
      const [error, res]: any = await Get(`/assistant/${assistant?.id}`, {
        id: assistant?.id,
      });
      if (error) {
        console.error("assistant", error);
        return;
      }
      setAssistantDetail(res)
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

  return { assistant, assistantRef, assistantDetail, handleKeyDownAutoResizeTextarea };
}
