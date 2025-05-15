import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAsyncEffect, useEventListener, useMount } from "ahooks";
import { isString } from "lodash-es";
import { error } from "@tauri-apps/plugin-log";

import { useAppStore } from "@/stores/appStore";
import useEscape from "@/hooks/useEscape";
import useSettingsWindow from "@/hooks/useSettingsWindow";
import { useThemeStore } from "@/stores/themeStore";
import platformAdapter from "@/utils/platformAdapter";
import { AppTheme } from "@/types/index";
import ErrorNotification from "@/components/Common/ErrorNotification";
import { useModifierKeyPress } from "@/hooks/useModifierKeyPress";
import { useIconfontScript } from "@/hooks/useScript";

export default function Layout() {
  const location = useLocation();

  const activeTheme = useThemeStore((state) => state.activeTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = useThemeStore((state) => state.isDark);
  const setIsDark = useThemeStore((state) => state.setIsDark);

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

  const { i18n } = useTranslation();
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }

    const setupLanguageListener = async () => {
      const unlisten = await platformAdapter.listenEvent(
        "language-changed",
        (event) => {
          i18n.changeLanguage(event.payload.language);
        }
      );
      return unlisten;
    };

    const unlistenPromise = setupLanguageListener();
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Disable right-click for production environment
  useEventListener("contextmenu", (event) => {
    if (import.meta.env.DEV) return;

    event.preventDefault();
  });

  useModifierKeyPress();

  useEventListener("unhandledrejection", ({ reason }) => {
    const message = isString(reason) ? reason : JSON.stringify(reason);

    error(message);
  });

  useIconfontScript();

  return (
    <>
      <Outlet />
      <ErrorNotification />
    </>
  );
}
