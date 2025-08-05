import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useAsyncEffect,
  useEventListener,
  useMount,
  useTextSelection,
} from "ahooks";
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
import { useDeepLinkManager } from '@/hooks/useDeepLinkManager';

export default function Layout() {
  const location = useLocation();

  const { language } = useAppStore();
  const { i18n } = useTranslation();
  const { activeTheme, isDark, setIsDark, setTheme } = useThemeStore();

  // init servers isTauri
  useServers();
  // init deep link manager
  useDeepLinkManager();

  const [langUpdated, setLangUpdated] = useState(false);

  useAsyncEffect(async () => {
    i18n.changeLanguage(language);

    await platformAdapter.invokeBackend("update_app_lang", {
      lang: language,
    });

    setLangUpdated(true);
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

  const { text: selectionText } = useTextSelection();

  // Disable right-click for production environment
  useEventListener("contextmenu", (event) => {
    if (import.meta.env.DEV || selectionText) return;

    event.preventDefault();
  });

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

  return (
    <>
      {langUpdated && <Outlet />}
      <ErrorNotification />
    </>
  );
}
