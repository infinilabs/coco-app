import { useEffect, useCallback } from "react";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";

const defaultWindowConfig = {
  label: "",
  title: "",
  url: "",
  width: 1000,
  height: 640,
  center: true,
  resizable: true,
  maximized: false,
  decorations: false,
  alwaysOnTop: false,
  dragDropEnabled: true,
  visible: true,
  shadow: true,
};

export const useWindows = () => {
  const appWindow = getCurrentWindow();

  const createWin = useCallback(async (options: any) => {
    const args = { ...defaultWindowConfig, ...options };

    const existWin = await getWin(args.label);

    if (existWin) {
      console.log("Window already exists>>", existWin);
      return;
    }

    const win = new WebviewWindow(args.label, args);

    win.once("tauri://created", async () => {
      console.log("tauri://created");
      // if (args.label.includes("main")) {
      //
      // }

      if (args.maximized && args.resizable) {
        console.log("is-maximized");
        await win.maximize();
      }
    });

    win.once("tauri://error", (error) => {
      console.error("error:", error);
    });
  }, []);

  const closeWin = useCallback(async (label: string) => {
    const targetWindow = await getWin(label);

    if (!targetWindow) {
      console.warn(`no found "${label}"`);
      return;
    }

    try {
      await targetWindow.close();
      console.log(`"${label}" close`);
    } catch (error) {
      console.error(`"${label}" error:`, error);
    }
  }, []);

  const getWin = useCallback(async (label: string) => {
    return WebviewWindow.getByLabel(label);
  }, []);

  const getAllWin = useCallback(async () => {
    return getAllWindows();
  }, []);

  const listenEvents = useCallback(() => {
    listen("win-create", (event) => {
      console.log(event);
      createWin(event.payload);
    });

    listen("win-show", async () => {
      if (!appWindow || appWindow.label.indexOf("main") === -1) return;
      await appWindow.show();
      await appWindow.unminimize();
      await appWindow.setFocus();
    });

    listen("win-hide", async () => {
      if (!appWindow || appWindow.label.indexOf("main") === -1) return;
      await appWindow.hide();
    });

    listen("win-close", async () => {
      await appWindow.close();
    });

    listen("open_settings", (event) => {
      console.log("open_settings", event);
      let url =  "/ui/settings"
      if (event.payload==="about") {
        url = "/ui/settings?tab=about"
      }
      createWin({
        label: "settings",
        title: "Settings Window",
        dragDropEnabled: true,
        center: true,
        width: 900,
        height: 600,
        alwaysOnTop: true,
        shadow: true,
        decorations: true,
        closable: true,
        minimizable: false,
        maximizable: false,
        url,
      });
    });
  }, [appWindow, createWin]);

  useEffect(() => {
    listenEvents();
  }, [listenEvents]);

  return {
    createWin,
    closeWin,
    getWin,
    getAllWin,
  };
};