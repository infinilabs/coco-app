import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";

// Custom hook to auto-resize window based on content height
const useAutoResizeWindow = () => {
  // Function to resize the window to the content's size
  const resizeWindowToContent = async () => {
    const contentHeight = document.body.scrollHeight;

    try {
      // Resize the window to fit content size
      await getCurrentWebviewWindow()?.setSize(
        new LogicalSize(680, contentHeight)
      );

      console.log("Window resized to content size");
    } catch (error) {
      console.error("Error resizing window:", error);
    }
  };

  useEffect(() => {
    // Initially resize the window
    resizeWindowToContent();

    // Set up a ResizeObserver to listen for changes in content size
    const resizeObserver = new ResizeObserver(() => {
      resizeWindowToContent();
    });

    // Observe the document body for content size changes
    resizeObserver.observe(document.body);

    // Clean up the observer when the component is unmounted
    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Only run once when the component is mounted

  // Optionally, you can return values if you need to handle window size elsewhere
};

export default useAutoResizeWindow;
