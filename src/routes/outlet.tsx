import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAsyncEffect, useEventListener, useMount } from "ahooks";
import { isArray, isString } from "lodash-es";

import { useAppStore } from "@/stores/appStore";
import useEscape from "@/hooks/useEscape";
import useSettingsWindow from "@/hooks/useSettingsWindow";
import { useThemeStore } from "@/stores/themeStore";
import platformAdapter from "@/utils/platformAdapter";
import { AppTheme } from "@/types/index";
import ErrorNotification from "@/components/Common/ErrorNotification";
import { useModifierKeyPress } from "@/hooks/useModifierKeyPress";
import { useIconfontScript } from "@/hooks/useScript";
import { Extension } from "@/components/Settings/Extensions";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { useServers } from "@/hooks/useServers";
import { useDeepLinkManager } from "@/hooks/useDeepLinkManager";
import { useSelectionPanel } from "@/hooks/useSelectionPanel";
import { useSelectionStore } from "@/stores/selectionStore";

export default function LayoutOutlet() {
  const location = useLocation();

  const { language } = useAppStore();
  const { i18n } = useTranslation();
  const { activeTheme, isDark, setIsDark, setTheme } = useThemeStore();

  // init servers isTauri
  useServers();
  // init deep link manager
  useDeepLinkManager();

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  function updateBodyClass(path: string) {
    const body = document.body;
    body.classList.remove("input-body");

    if (path === "/ui") {
      body.classList.add("input-body");
    }
  }

  useMount(async () => {
    await platformAdapter.setShadow(true);

    const unlistenTheme = await platformAdapter.listenThemeChanged(
      (theme: AppTheme) => {
        setTheme(theme);
        setIsDark(theme === "dark");
      }
    );

    platformAdapter.onThemeChanged(({ payload }) => {
      if (activeTheme !== "auto") return;

      setIsDark(payload === "dark");
    });

    return () => {
      unlistenTheme();
    };
  });

  useAsyncEffect(async () => {
    let nextTheme: any = activeTheme === "auto" ? null : activeTheme;

    await platformAdapter.setWindowTheme(nextTheme);

    nextTheme = nextTheme ?? (await platformAdapter.getWindowTheme());

    setIsDark(nextTheme === "dark");
  }, [activeTheme]);

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    const root = window.document.documentElement;

    root.className = theme;
    root.dataset.theme = theme;
  }, [isDark]);

  useEffect(() => {
    updateBodyClass(location.pathname);
  }, [location.pathname]);

  useEscape();

  useSettingsWindow();

  useModifierKeyPress();

  useEventListener("unhandledrejection", ({ reason }) => {
    const message = isString(reason) ? reason : JSON.stringify(reason);

    platformAdapter.error(message);
  });

  useIconfontScript();

  const setDisabledExtensions = useExtensionsStore((state) => {
    return state.setDisabledExtensions;
  });

  useMount(async () => {
    const result = await platformAdapter.invokeBackend<Extension[]>(
      "list_extensions",
      {
        listEnabled: false,
      }
    );

    if (!isArray(result)) return;

    const disabledExtensions = result.filter((item) => !item.enabled);

    setDisabledExtensions(disabledExtensions.map((item) => item.id));
  });

  // --- Selection window ---
  const { state, close } = useSelectionPanel();

  useEffect(() => {
    const openSelectionWindow = async (payload: any) => {
      // 全局开关：关闭时不创建、不显示选择窗口
      if (!useSelectionStore.getState().selectionEnabled) {
        const existing = await platformAdapter.getWindowByLabel("selection");
        if (existing) {
          await existing.hide();
        }
        return;
      }

      const label = "selection";
      const width = 550;
      const height = 75;

      const options: any = {
        label,
        title: "Selection",
        width,
        height,
        alwaysOnTop: true,
        shadow: true,
        decorations: false,
        transparent: false,
        closable: true,
        minimizable: false,
        maximizable: false,
        dragDropEnabled: true,
        resizable: false,
        center: false,
        url: "/ui/selection",
        data: { timestamp: Date.now() },
      };

      const raw = typeof payload === "string" ? payload : String(payload?.text ?? "");
      const text = raw.trim();
      const px = Number(payload?.x ?? 0);
      const py = Number(payload?.y ?? 0);

      const existingWindow = await platformAdapter.getWindowByLabel(label);

      // 空内容时立即隐藏，不创建/显示窗口
      if (!text) {
        if (existingWindow) {
          await existingWindow.hide();
        }
        await platformAdapter.emitEvent("selection-text", "");
        return;
      }

      if (!existingWindow) {
        await platformAdapter.createWindow(label, options);
      }
      const win = await platformAdapter.getWindowByLabel(label);
      if (!win) return;

      // 强制设置尺寸（即便窗口已存在）
      // @ts-ignore
      await win.setSize({ type: "Logical", width, height });

      await win.show();
      // 避免抢焦点
      // await win.setFocus();

      // 按鼠标位置放置窗口
      if (px > 0 || py > 0) {
        const offsetX = 12;
        const offsetY = 20;
        const targetX = Math.max(0, px + offsetX);
        const targetY = Math.max(0, py - height - offsetY);
        // @ts-ignore
        await win.setPosition({ type: "Physical", x: targetX, y: targetY });
      } else {
        await win.center();
      }

      await platformAdapter.emitEvent("selection-text", text);
    };

    if (state.visible && state.text) {
      openSelectionWindow(state.text);
      close();
    }

    // 改为监听 selection-detected（来自后端）
    const unlistenSelection = platformAdapter.listenEvent(
      "selection-detected",
      async (event: any) => {
        const payload = event?.payload;
        await openSelectionWindow(payload);
      }
    );

    return () => {
      unlistenSelection.then((fn) => fn());
    };
  }, [state.visible, state.text, close]);

  return (
    <>
      <Outlet />
      <ErrorNotification />
    </>
  );
}
