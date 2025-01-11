import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

interface CreateWindowOptions {
  label?: string;
  title?: string;
  width?: number;
  height?: number;
  center?: boolean;
  url?: string;
  resizable?: boolean;
  [key: string]: any;
}

export default function useSettingsWindow() {
  const openSettingsWindow = useCallback((tab?: string) => {
    const url = tab ? `/ui/settings?tab=${tab}` : `/ui/settings`;
    const options: CreateWindowOptions = {
      label: "settings",
      title: "Settings Window",
      width: 1000,
      height: 600,
      alwaysOnTop: false,
      shadow: true,
      decorations: true,
      transparent: false,
      closable: true,
      minimizable: false,
      maximizable: false,
      dragDropEnabled: true,
      center: true,
      url,
    };

    // Check if the window already exists
    WebviewWindow.getByLabel(options.label!).then((existingWindow) => {
      if (existingWindow) {
        existingWindow.show();
        existingWindow.setFocus();
        existingWindow.center();
      } else {
        new WebviewWindow(options.label!, options);
      }
    });
  }, []);

  useEffect(() => {
    const unlisten = listen("open_settings", (event) => {
      console.log("open_settings event received:", event);
      const tab = event.payload as string | undefined;

      openSettingsWindow(tab);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return { openSettingsWindow };
}
