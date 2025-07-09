import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useTauriFocus } from "./useTauriFocus";

export function useWindowEvents() {
  const isPinned = useAppStore((state) => state.isPinned);
  const visible = useAppStore((state) => state.visible);
  const setBlurred = useAppStore((state) => state.setBlurred);

  useTauriFocus({
    onBlur() {
      if (isPinned || visible) {
        return setBlurred(true);
      }

      platformAdapter.hideWindow();

      console.log("Hide Coco");
    },
  });
}
