import { useCallback, useEffect } from "react";

import { isMetaOrCtrlKey } from "@/utils/keyboardUtils";
import { useSearchStore } from "@/stores/searchStore";

interface KeyboardHandlersProps {
  isChatMode: boolean;
  handleSubmit: () => void;
  curChatEnd?: boolean;
}

export function useKeyboardHandlers({
  isChatMode,
  handleSubmit,
  curChatEnd,
}: KeyboardHandlersProps) {
  const { setSourceData } = useSearchStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Handle ArrowLeft with meta key
      if (e.code === "ArrowLeft" && isMetaOrCtrlKey(e)) {
        e.preventDefault();
        setSourceData(undefined);
        return;
      }

      // Handle Enter without meta key requirement
      if (e.code === "Enter" && !e.shiftKey && isChatMode) {
        e.preventDefault();
        curChatEnd && handleSubmit();
      }
    },
    [isChatMode, handleSubmit, setSourceData, curChatEnd]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    return () => {
      setSourceData(undefined);
    };
  }, []);
}
