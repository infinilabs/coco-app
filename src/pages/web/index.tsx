import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isPlainObject } from "lodash-es";

import SearchChat from "@/components/SearchChat";
import { WINDOW_CENTER_BASELINE_HEIGHT } from "@/constants";
import { useAppStore } from "@/stores/appStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModifierKeyPress } from "@/hooks/useModifierKeyPress";
import useEscape from "@/hooks/useEscape";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import type { StartPage } from "@/types/chat";
import ErrorNotification from "@/components/Common/ErrorNotification";
import { Get } from "@/api/axiosRequest";
import { useWebConfigStore } from "@/stores/webConfigStore";

import "@/i18n";
import "@/web.css";

interface WebAppProps {
  headers?: Record<string, unknown>;
  serverUrl?: string;
  width?: number;
  height?: number;
  hasModules?: string[];
  defaultModule?: "search" | "chat";
  assistantIDs?: string[];
  theme?: "auto" | "light" | "dark";
  searchPlaceholder?: string;
  chatPlaceholder?: string;
  showChatHistory?: boolean;
  startPage?: StartPage;
  setIsPinned?: (value: boolean) => void;
  onCancel?: () => void;
  formatUrl?: (item: any) => string;
  isOpen?: boolean;
  language?: string;
  settings?: any;
  refreshSettings?: () => Promise<void>;
}

function WebApp({
  width = 680,
  height = WINDOW_CENTER_BASELINE_HEIGHT,
  headers = {
    "X-API-TOKEN": "",
    "APP-INTEGRATION-ID": "",
  },
  serverUrl = "",
  hasModules = ["search", "chat"],
  defaultModule = "search",
  assistantIDs = [],
  theme = "auto",
  searchPlaceholder = "",
  chatPlaceholder = "",
  showChatHistory = false,
  startPage,
  setIsPinned,
  onCancel,
  formatUrl,
  language = "en",
  settings,
  refreshSettings,
}: WebAppProps) {
  const { setIsTauri, setEndpoint } = useAppStore();
  const setModeSwitch = useShortcutsStore((state) => state.setModeSwitch);
  const setInternetSearch = useShortcutsStore((state) => {
    return state.setInternetSearch;
  });
  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const {
    integration,
    loginInfo,
    setIntegration,
    setLoginInfo,
    setOnRefresh,
    setDisabled,
  } = useWebConfigStore();

  const getUserProfile = async () => {
    const [err, result] = await Get("/account/profile");

    if (err || !isPlainObject(result)) {
      setLoginInfo(void 0);
      return;
    }

    setLoginInfo(result as any);
  };

  useEffect(() => {
    getUserProfile();

    setIsTauri(false);
    setEndpoint(serverUrl);
    setModeSwitch("S");
    setInternetSearch("E");
    setIntegration(settings);
    setOnRefresh(async () => {
      await getUserProfile();
      return refreshSettings?.();
    });

    localStorage.setItem("headers", JSON.stringify(headers || {}));
  }, []);

  const isMobile = useIsMobile();

  const [isChatMode, setIsChatMode] = useState(false);

  useEscape();
  useModifierKeyPress();
  useViewportHeight();

  useEffect(() => {
    setDisabled(!loginInfo && !integration?.guest?.enabled);
  }, [integration, loginInfo]);

  return (
    <div
      id="searchChat-container"
      className={`coco-container relative ${theme} border! border-(--border) rounded-xl`}
      data-theme={theme}
      style={{
        maxWidth: `${width}px`,
        width: `100vw`,
        height: isMobile ? "calc(var(--vh, 1vh) * 100)" : `${height}px`,
      }}
    >
      {isMobile && (
        <div
          className={`fixed ${
            isChatMode ? "top-1" : "top-3"
          } right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 cursor-pointer z-50`}
          onClick={onCancel}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="#FF4D4F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      <SearchChat
        isTauri={false}
        hasModules={hasModules}
        defaultModule={defaultModule}
        theme={theme}
        searchPlaceholder={searchPlaceholder}
        chatPlaceholder={chatPlaceholder}
        showChatHistory={showChatHistory}
        setIsPinned={setIsPinned}
        onModeChange={setIsChatMode}
        isMobile={isMobile}
        assistantIDs={assistantIDs}
        startPage={startPage}
        formatUrl={formatUrl}
      />
      <ErrorNotification isTauri={false} />
    </div>
  );
}

export default WebApp;
