import { useEffect, useCallback } from "react";
import { listen} from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import { isMetaOrCtrlKey } from "@/utils/keyboardUtils";
import { useAppStore } from "@/stores/appStore";

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
  const setTabIndex = useAppStore((state) => state.setTabIndex);

  const openSettingsWindow = useCallback((tab?: string) => {
    const url = tab ? `/ui/settings?tab=${tab}` : `/ui/settings`;
    const options: CreateWindowOptions = {
      label: "settings",
      title: "Coco Settings",
      width: 1000,
      height: 700,
      alwaysOnTop: false,
      shadow: true,
      decorations: true,
      transparent: false,
      closable: true,
      minimizable: false,
      maximizable: false,
      dragDropEnabled: true,
      resizable: false,
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isMetaOrCtrlKey(e)) {
        switch (e.code) {
          case "Comma":
            openSettingsWindow()
            break;
          default:
            break;
        }
      }
    },
    [openSettingsWindow]
  );

  useEffect(() => {
    const unlisten = listen("open_settings", (event) => {
      console.log("open_settings event received:", event);
      const tab = event.payload as string | "";

      setTabIndex(tab)
      openSettingsWindow(tab);
    });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlisten.then((fn) => fn());
      window.addEventListener("keydown", handleKeyDown);
    };
  }, [openSettingsWindow, handleKeyDown]);

  return { openSettingsWindow };
}
