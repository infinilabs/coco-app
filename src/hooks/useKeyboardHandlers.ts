import { useCallback, useEffect } from "react";

import { useSearchStore } from "@/stores/searchStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";

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
  const {
    setSourceData,
    visibleExtensionStore,
    setVisibleExtensionStore,
    visibleExtensionDetail,
    setVisibleExtensionDetail,
  } = useSearchStore();
  const { modifierKey } = useShortcutsStore();

  const getModifierKeyPressed = (event: KeyboardEvent) => {
    const metaKeyPressed = event.metaKey && modifierKey === "meta";
    const ctrlKeyPressed = event.ctrlKey && modifierKey === "ctrl";
    const altKeyPressed = event.altKey && modifierKey === "alt";

    return metaKeyPressed || ctrlKeyPressed || altKeyPressed;
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Handle ArrowLeft with meta key
      if (e.code === "ArrowLeft" && getModifierKeyPressed(e)) {
        e.preventDefault();

        if (visibleExtensionDetail) {
          return setVisibleExtensionDetail(false);
        }

        if (visibleExtensionStore) {
          return setVisibleExtensionStore(false);
        }

        return setSourceData(void 0);
      }
    },
    [
      isChatMode,
      handleSubmit,
      setSourceData,
      curChatEnd,
      modifierKey,
      visibleExtensionDetail,
    ]
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
      setVisibleExtensionStore(false);
    };
  }, []);
}
