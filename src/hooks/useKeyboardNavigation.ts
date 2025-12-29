import { useCallback, useEffect } from "react";

import { useShortcutsStore } from "@/stores/shortcutsStore";
import type { QueryHits, SearchDocument } from "@/types/search";
import platformAdapter from "@/utils/platformAdapter";
import { useSearchStore } from "@/stores/searchStore";
import { isNumber } from "lodash-es";

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
  formatUrl?: (item: any) => string;
  searchData: Record<string, QueryHits[]>;
}

export function useKeyboardNavigation({
  suggests,
  selectedIndex,
  setSelectedIndex,
  showIndex,
  setShowIndex,
  setSelectedName,
  globalItemIndexMap,
  isChatMode,
  formatUrl,
  searchData,
}: UseKeyboardNavigationProps) {
  const { openPopover, modifierKey } = useShortcutsStore();
  const { visibleContextMenu, setSelectedSearchContent } = useSearchStore();

  const getModifierKeyPressed = (event: KeyboardEvent) => {
    const metaKeyPressed = event.metaKey && modifierKey === "meta";
    const ctrlKeyPressed = event.ctrlKey && modifierKey === "ctrl";
    const altKeyPressed = event.altKey && modifierKey === "alt";

    return metaKeyPressed || ctrlKeyPressed || altKeyPressed;
  };

  const getGroupContext = () => {
    const groupEntries = Object.entries(searchData);
    const groupIndex = groupEntries.findIndex(([_, value]) => {
      return value.some((item) => {
        return item.document.index === selectedIndex;
      });
    });

    return {
      groupEntries,
      groupIndex,
    };
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { openPopover } = useShortcutsStore.getState();
      const { visibleContextMenu } = useSearchStore.getState();

      if (isChatMode || !suggests.length || openPopover || visibleContextMenu) {
        return;
      }

      const modifierKeyPressed = getModifierKeyPressed(e);

      const indexes = suggests.map((item) => item.document.index!);

      if (e.key === "ArrowUp") {
        console.log("ArrowUp pressed");

        e.preventDefault();

        let nextIndex: number | undefined = void 0;

        if (modifierKeyPressed) {
          const { groupEntries, groupIndex } = getGroupContext();

          const nextGroupIndex =
            groupIndex > 0 ? groupIndex - 1 : groupEntries.length - 1;

          nextIndex = groupEntries[nextGroupIndex][1][0].document.index;
        }

        setSelectedIndex((prev) => {
          if (prev == null) {
            return Math.min(...indexes);
          }

          if (isNumber(nextIndex)) {
            return nextIndex;
          }

          nextIndex = prev - 1;

          if (indexes.includes(nextIndex)) {
            return nextIndex;
          }

          return Math.max(...indexes);
        });
      } else if (e.key === "ArrowDown") {
        console.log("ArrowDown pressed");

        e.preventDefault();

        let nextIndex: number | undefined = void 0;

        if (modifierKeyPressed) {
          const { groupEntries, groupIndex } = getGroupContext();

          const nextGroupIndex =
            groupIndex < groupEntries.length - 1 ? groupIndex + 1 : 0;

          nextIndex = groupEntries[nextGroupIndex][1][0].document.index;
        }

        setSelectedIndex((prev) => {
          if (prev == null) {
            return Math.min(...indexes);
          }

          if (isNumber(nextIndex)) {
            return nextIndex;
          }

          nextIndex = prev + 1;

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

      if (e.key === "Enter" && !e.shiftKey && selectedIndex !== null) {
        const item = globalItemIndexMap[selectedIndex];

        return platformAdapter.openSearchItem(item, formatUrl);
      }

      if (e.key >= "0" && e.key <= "9" && showIndex && modifierKeyPressed) {
        e.preventDefault();

        let index = parseInt(e.key, 10);

        index = index === 0 ? 9 : index - 1;

        const item = globalItemIndexMap[index];

        setSelectedSearchContent(item);

        platformAdapter.openSearchItem(item, formatUrl);
      }
    },
    [
      suggests,
      selectedIndex,
      showIndex,
      globalItemIndexMap,
      openPopover,
      visibleContextMenu,
    ]
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
