import { useCallback } from "react";

import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { toggle_move_to_active_space_attribute } from "@/commands/system";

interface UseTogglePinOptions {
  onPinChange?: (isPinned: boolean) => void;
}

export const useTogglePin = (options?: UseTogglePinOptions) => {
  const { isPinned, setIsPinned } = useAppStore();

  const togglePin = useCallback(async () => {
    try {
      const newPinned = !isPinned;

      if (options?.onPinChange) {
        options.onPinChange(newPinned);
      }

      await platformAdapter.setAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
      toggle_move_to_active_space_attribute();
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
    }
  }, [isPinned, setIsPinned, options?.onPinChange]);

  return {
    isPinned,
    togglePin,
  };
};
