import { useCallback, useEffect } from "react";

import { useShortcutsStore } from "@/stores/shortcutsStore";
import type { QueryHits, SearchDocument } from "@/types/search";
import platformAdapter from "@/utils/platformAdapter";
import { useSearchStore } from "@/stores/searchStore";

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
  const visibleContextMenu = useSearchStore((state) => {
    return state.visibleContextMenu;
  });
  const modifierKey = useShortcutsStore((state) => {
    return state.modifierKey;
  });

  const getModifierKeyPressed = (event: KeyboardEvent) => {
    const metaKeyPressed = event.metaKey && modifierKey === "meta";
    const ctrlKeyPressed = event.ctrlKey && modifierKey === "ctrl";
    const altKeyPressed = event.altKey && modifierKey === "alt";

    return metaKeyPressed || ctrlKeyPressed || altKeyPressed;
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isChatMode || !suggests.length || openPopover || visibleContextMenu) {
        return;
      }

      const modifierKeyPressed = getModifierKeyPressed(e);

      const indexes = suggests.map((item) => item.document.index!);

      if (e.key === "ArrowUp") {
        e.preventDefault();
        // console.log("ArrowUp pressed", selectedIndex, suggests.length);
        setSelectedIndex((prev) => {
          if (prev == null) {
            return Math.min(...indexes);
          }

          const nextIndex = prev - 1;

          if (indexes.includes(nextIndex)) {
            return nextIndex;
          }

          return Math.max(...indexes);
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        //console.log("ArrowDown pressed", selectedIndex, suggests.length);
        setSelectedIndex((prev) => {
          if (prev == null) {
            return Math.min(...indexes);
          }

          const nextIndex = prev + 1;

          if (indexes.includes(nextIndex)) {
            return nextIndex;
          }

          return Math.min(...indexes);
        });
      } else if (modifierKeyPressed) {
        if (selectedIndex !== null) {
          const item = globalItemIndexMap[selectedIndex];
          setSelectedName(item?.source?.name || "");
        }
        setShowIndex(true);
      }

      if (
        modifierKeyPressed &&
        e.key === "ArrowRight" &&
        selectedIndex !== null
      ) {
        e.preventDefault();

        const item = globalItemIndexMap[selectedIndex];

        handleItemAction(item);
      }

      if (e.key === "Enter" && !e.shiftKey && selectedIndex !== null) {
        const item = globalItemIndexMap[selectedIndex];

        return platformAdapter.openSearchItem(item);
      }

      if (e.key >= "0" && e.key <= "9" && showIndex && modifierKeyPressed) {
        e.preventDefault();

        let index = parseInt(e.key, 10);

        index = index === 0 ? 9 : index - 1;

        const item = globalItemIndexMap[index];

        platformAdapter.openSearchItem(item);
      }
    },
    [suggests, selectedIndex, showIndex, globalItemIndexMap, openPopover]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (isChatMode || !suggests.length) return;

      const modifierKeyPressed = getModifierKeyPressed(e);

      if (modifierKeyPressed) {
        setShowIndex(false);
      }
    },
    [suggests]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
