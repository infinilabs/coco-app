import { useEffect, useCallback } from "react";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";

const defaultWindowConfig = {
  label: null,
  title: "",
  url: "",
  width: 1000,
  height: 640,
  minWidth: null,
  minHeight: null,
  x: null,
  y: null,
  center: true,
  resizable: true,
  maximized: false,
  decorations: false,
  alwaysOnTop: true,
  dragDropEnabled: true,
  visible: true,
};

const useWindows = () => {
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
      if (args.label.includes("main")) {
        //
      }

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

export default useWindows;
