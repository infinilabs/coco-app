import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

export default function Layout() {

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Hide the Tauri app window when 'Esc' is pressed
        await invoke("hide_coco");
        console.log("App window hidden successfully.");
      }
    };

    // Add event listener for keydown
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return <Outlet />;
}
