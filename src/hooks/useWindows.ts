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

  // 创建窗口
  const createWin = useCallback(async (options: any) => {
    const args = { ...defaultWindowConfig, ...options };

    // 检查窗口是否已存在
    const existWin = await getWin(args.label);
    if (existWin) {
      console.log("窗口已存在>>", existWin);
      return;
    }

    // 创建新窗口
    const win = new WebviewWindow(args.label, args);

    win.once("tauri://created", async () => {
      console.log("tauri://created");
      if (args.label.includes("main")) {
        // 主窗口相关逻辑
      }

      if (args.maximized && args.resizable) {
        console.log("is-maximized");
        await win.maximize();
      }
    });

    win.once("tauri://error", (error) => {
      console.error("窗口创建失败:", error);
    });
  }, []);

  // 关闭指定窗口
  const closeWin = useCallback(async (label: string) => {
    const targetWindow = await getWin(label);

    if (!targetWindow) {
      console.warn(`未找到标签为 "${label}" 的窗口`);
      return;
    }

    try {
      await targetWindow.close();
      console.log(`窗口 "${label}" 已关闭`);
    } catch (error) {
      console.error(`关闭窗口 "${label}" 时出错:`, error);
    }
  }, []);


  // 获取指定窗口
  const getWin = useCallback(async (label: string) => {
    return WebviewWindow.getByLabel(label);
  }, []);

  // 获取所有窗口
  const getAllWin = useCallback(async () => {
    return getAllWindows();
  }, []);

  // 开启事件监听
  const listenEvents = useCallback(() => {
    console.log("——+——+——+——+——+开始监听窗口");

    // 创建窗口事件
    listen("win-create", (event) => {
      console.log(event);
      createWin(event.payload);
    });

    // 显示窗口事件
    listen("win-show", async () => {
      if (!appWindow || appWindow.label.indexOf("main") === -1) return;
      await appWindow.show();
      await appWindow.unminimize();
      await appWindow.setFocus();
    });

    // 隐藏窗口事件
    listen("win-hide", async () => {
      if (!appWindow || appWindow.label.indexOf("main") === -1) return;
      await appWindow.hide();
    });

    // 关闭窗口事件
    listen("win-close", async () => {
      await appWindow.close();
    });
  }, [appWindow, createWin]);

  // 自动注册事件监听
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
