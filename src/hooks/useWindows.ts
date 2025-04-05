import { useState, useEffect, useCallback } from "react";

import platformAdapter from "@/utils/platformAdapter";

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
  const [appWindow, setAppWindow] = useState<any>(null);

  useEffect(() => {
    const fetchWindow = async () => {
      try {
        const window = await platformAdapter.getCurrentWindow();
        setAppWindow(window);
      } catch (error) {
        console.error("Failed to get current window:", error);
      }
    };

    fetchWindow();
  }, []);

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

    const win = await platformAdapter.createWebviewWindow(args.label, args);

    if(win) {
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

      win.once("tauri://error", (error: any) => {
        console.error("error:", error);
      });
    }

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
    return platformAdapter.getWindowByLabel(label);
  }, []);

  const getAllWin = useCallback(async () => {
    return platformAdapter.getAllWindows();
  }, []);

  const listenEvents = useCallback(() => {
    let unlistenHandlers: { (): void; (): void; (): void; (): void; }[] = [];

    const setupListeners = async () => {
      const winCreateHandler = await platformAdapter.listenWindowEvent("win-create", (event) => {
        console.log(event);
        createWin(event.payload);
      });
      unlistenHandlers.push(winCreateHandler);

      const winShowHandler = await platformAdapter.listenWindowEvent("win-show", async () => {
        if (!appWindow || !appWindow.label.includes("main")) return;
        await appWindow.show();
        await appWindow.unminimize();
        await appWindow.setFocus();
      });
      unlistenHandlers.push(winShowHandler);

      const winHideHandler = await platformAdapter.listenWindowEvent("win-hide", async () => {
        if (!appWindow || !appWindow.label.includes("main")) return;
        await appWindow.hide();
      });
      unlistenHandlers.push(winHideHandler);

      const winCloseHandler = await platformAdapter.listenWindowEvent("win-close", async () => {
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