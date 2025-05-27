import { useCallback, useEffect } from 'react';

import { metaOrCtrlKey } from "@/utils/keyboardUtils";
import { useSearchStore } from "@/stores/searchStore";

export function useKeyboardHandlers({
  isChatMode,
  handleSubmit,
  setSourceData,
  disabledChange,
  curChatEnd,
}: any) {
  const {visibleContextMenu} = useSearchStore();

  const pressedKeys = new Set<string>();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      pressedKeys.add(e.key);

      if (pressedKeys.has(metaOrCtrlKey())) {
        switch (e.code) {
          case "ArrowLeft":
            setSourceData(undefined);
            break;
          case "Enter":
            isChatMode && (curChatEnd ? handleSubmit() : disabledChange?.());
            break;
          default:
            break;
        }
      }
    },
    [isChatMode, handleSubmit, setSourceData, disabledChange, curChatEnd, visibleContextMenu]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    pressedKeys.delete(e.key);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { pressedKeys };
}