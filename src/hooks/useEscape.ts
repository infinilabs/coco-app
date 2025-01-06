import { useEffect } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const useEscape = () => {
  const handleEscape = async (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      // Hide the Tauri app window when 'Esc' is pressed
      await invoke("hide_coco");
      console.log("App window hidden successfully.");
    }
  };

  useEffect(() => {
    if(!isTauri()) return;
    
    const unlisten = listen("tauri://focus", () => {
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
