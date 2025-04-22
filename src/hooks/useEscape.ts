import { useCallback, useEffect } from "react";

import platformAdapter from "@/utils/platformAdapter";
import { useSearchStore } from "@/stores/searchStore";

const useEscape = () => {
  const visibleContextMenu = useSearchStore((state) => {
    return state.visibleContextMenu;
  });
  const setVisibleContextMenu = useSearchStore((state) => {
    return state.setVisibleContextMenu;
  });

  const handleEscape = useCallback(() => {
    async (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        console.log("Escape key pressed.");

        event.preventDefault();

        if (visibleContextMenu) {
          return setVisibleContextMenu(false);
        }

        // Hide the Tauri app window when 'Esc' is pressed
        await platformAdapter.invokeBackend("hide_coco");

        console.log("App window hidden successfully.");
      }
    };
  }, [visibleContextMenu]);

  useEffect(() => {
    const unlisten = platformAdapter.listenEvent("tauri://focus", () => {
      // Add event listener for keydown
      window.addEventListener("keydown", handleEscape);
    });

    // Cleanup event listener on component unmount
    return () => {
      unlisten.then((unlistenFn) => unlistenFn());

      window.removeEventListener("keydown", handleEscape);
    };
  }, []);
};

export default useEscape;
