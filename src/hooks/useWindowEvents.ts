import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useTauriFocus } from "./useTauriFocus";

export function useWindowEvents() {
  const { setBlurred } = useAppStore();

  useTauriFocus({
    onBlur() {
      const { isPinned, visible } = useAppStore.getState();

      if (isPinned || visible) {
        return setBlurred(true);
      }

      platformAdapter.hideWindow();

      console.log("Hide Coco");
    },
  });
}
