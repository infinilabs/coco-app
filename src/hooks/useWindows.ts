import { useEffect, useCallback } from "react";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";

const defaultWindowConfig = {
  label: "",
  title: "",
  url: "",
  width: 1000,
  height: 800,
  minWidth: 1000,
  minHeight: 800,
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
  if (!isTauri()) return {}
  const appWindow = getCurrentWindow();

  const createWin = useCallback(async (options: any) => {
    const args = { ...defaultWindowConfig, ...options };

    const existWin = await getWin(args.label);

    if (existWin) {
      console.log("Window already exists>>", existWin, existWin.show);
      await existWin.show();
      await existWin.setFocus();
      await existWin.center();
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
    let unlistenHandlers: { (): void; (): void; (): void; (): void; }[] = [];

    const setupListeners = async () => {
      const winCreateHandler = await listen("win-create", (event) => {
        console.log(event);
        createWin(event.payload);
      });
      unlistenHandlers.push(winCreateHandler);

      const winShowHandler = await listen("win-show", async () => {
        if (!appWindow || !appWindow.label.includes("main")) return;
        await appWindow.show();
        await appWindow.unminimize();
        await appWindow.setFocus();
      });
      unlistenHandlers.push(winShowHandler);

      const winHideHandler = await listen("win-hide", async () => {
        if (!appWindow || !appWindow.label.includes("main")) return;
        await appWindow.hide();
      });
      unlistenHandlers.push(winHideHandler);

      const winCloseHandler = await listen("win-close", async () => {
        await appWindow.close();
      });
      unlistenHandlers.push(winCloseHandler);
    };

    setupListeners();

    // Cleanup function to remove all listeners
    return () => {
      unlistenHandlers.forEach((unlistenHandler) => unlistenHandler());
    };
  }, [appWindow, createWin]);

  useEffect(() => {
    const cleanup = listenEvents();
    return cleanup; // Ensure cleanup on unmount
  }, [listenEvents]);

  return {
    createWin,
    closeWin,
    getWin,
    getAllWin,
  };
};