import { useEffect } from "react";

import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";

export function useWindowEvents() {
  const isPinned = useAppStore((state) => state.isPinned);
  const visible = useAppStore((state) => state.visible);

  useEffect(() => {
    const handleBlur = async () => {
      console.log("Window blurred");
      if (isPinned || visible) {
        return;
      }

      await platformAdapter.hideWindow();
      console.log("Hide Coco");
    };

    window.addEventListener("blur", handleBlur);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [isPinned, visible]);
}
