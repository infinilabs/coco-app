import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";

import { useAppStore } from "@/stores/appStore";
import useEscape from "@/hooks/useEscape";
import useSettingsWindow from "@/hooks/useSettingsWindow";
import { useEventListener } from "ahooks";

export default function Layout() {
  const location = useLocation();

  function updateBodyClass(path: string) {
    const body = document.body;
    body.className = "";

    if (path === "/ui") {
      body.classList.add("input-body");
    }
  }

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
