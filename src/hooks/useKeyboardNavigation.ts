import { useCallback, useEffect } from 'react';

import { useShortcutsStore } from "@/stores/shortcutsStore";
import { isMetaOrCtrlKey, metaOrCtrlKey } from '@/utils/keyboardUtils';
import { copyToClipboard } from "@/utils/index";
import type { QueryHits, SearchDocument } from "@/types/search";
import platformAdapter from "@/utils/platformAdapter";

interface UseKeyboardNavigationProps {
  suggests: QueryHits[];
  selectedIndex: number | null;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showIndex: boolean;
  setShowIndex: (show: boolean) => void;
  setSelectedName: (name: string) => void;
  globalItemIndexMap: Record<number, SearchDocument>;
  handleItemAction: (item: SearchDocument) => void;
  isChatMode: boolean;
}


export function useKeyboardNavigation({
  suggests,
  selectedIndex,
  setSelectedIndex,
  showIndex,
  setShowIndex,
  setSelectedName,
  globalItemIndexMap,
  handleItemAction,
  isChatMode,
}: UseKeyboardNavigationProps) {
  const openPopover = useShortcutsStore((state) => state.openPopover);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!suggests.length || openPopover) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        //console.log("ArrowUp pressed", selectedIndex, suggests.length);
        setSelectedIndex((prev) => (prev === null || prev === 0) ? suggests.length - 1 : prev - 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        //console.log("ArrowDown pressed", selectedIndex, suggests.length);
        setSelectedIndex((prev) => (prev === null || prev === suggests.length - 1) ? 0 : prev + 1);
      } else if (e.key === metaOrCtrlKey()) {
        e.preventDefault();
        if (selectedIndex !== null) {
          const item = globalItemIndexMap[selectedIndex];
          setSelectedName(item?.source?.name || "");
        }
        setShowIndex(true);
      }

      if (
        e.key === "ArrowRight" &&
        selectedIndex !== null &&
        isMetaOrCtrlKey(e)
      ) {
        e.preventDefault();

        const item = globalItemIndexMap[selectedIndex];

        handleItemAction(item);
      }

      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        selectedIndex !== null
      ) {
        const item = globalItemIndexMap[selectedIndex];
        if (item?.on_opened) {
          platformAdapter.invokeBackend("open", { onOpened: item.on_opened });
        } else {
          copyToClipboard(item?.payload?.result?.value);
        }
      }

      if (e.key >= "0" && e.key <= "9" && showIndex && isMetaOrCtrlKey(e)) {
        let index = parseInt(e.key, 10);

        index = index === 0 ? 9 : index - 1;

        const item = globalItemIndexMap[index];

        if (item?.on_opened) {
          platformAdapter.invokeBackend("open", { onOpened: item.on_opened });
        }
      }
    },
    [suggests, selectedIndex, showIndex, globalItemIndexMap, openPopover]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!suggests.length) return;

      if (!isMetaOrCtrlKey(e)) {
        setShowIndex(false);
      }
    },
    [suggests]
  );

  useEffect(() => {
    if (isChatMode) return;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}