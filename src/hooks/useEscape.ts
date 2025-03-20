import { useEffect } from "react";

import platformAdapter from "@/utils/platformAdapter";


const useEscape = () => {
  const handleEscape = async (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      console.log("Escape key pressed.");

      event.preventDefault();

      // Hide the Tauri app window when 'Esc' is pressed
      await platformAdapter.invokeBackend("hide_coco");

      console.log("App window hidden successfully.");
    }
  };

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
