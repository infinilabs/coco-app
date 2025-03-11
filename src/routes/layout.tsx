import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";

import { useAppStore } from "@/stores/appStore";
import useEscape from "@/hooks/useEscape";
import useSettingsWindow from "@/hooks/useSettingsWindow";
import { useAsyncEffect, useEventListener, useMount } from "ahooks";
import { useThemeStore } from "@/stores/themeStore";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AppTheme } from "@/utils/tauri";

const appWindow = getCurrentWebviewWindow();

export default function Layout() {
  const location = useLocation();

  const activeTheme = useThemeStore((state) => state.activeTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = useThemeStore((state) => state.isDark);
  const setIsDark = useThemeStore((state) => state.setIsDark);

  function updateBodyClass(path: string) {
    const body = document.body;
    body.className = "";

    if (path === "/ui") {
      body.classList.add("input-body");
    }
  }

  useMount(async () => {
    listen<AppTheme>("theme-changed", ({ payload }) => {
      setTheme(payload);
    });

    appWindow.onThemeChanged(({ payload }) => {
      if (activeTheme !== "auto") return;

      setIsDark(payload === "dark");
    });
  });

  useAsyncEffect(async () => {
    let nextTheme = activeTheme === "auto" ? null : activeTheme;

    await appWindow.setTheme(nextTheme);

    nextTheme = nextTheme ?? (await appWindow.theme());

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

  const { i18n } = useTranslation();
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }

    const unlistenLanguageChange = listen("language-changed", (event: any) => {
      const { language } = event.payload;
      i18n.changeLanguage(language);
    });

    return () => {
      unlistenLanguageChange.then((unlisten) => unlisten());
    };
  }, []);

  // Disable right-click for production environment
  useEventListener("contextmenu", (event) => {
    if (import.meta.env.DEV) return;

    event.preventDefault();
  });

  return <Outlet />;
}
