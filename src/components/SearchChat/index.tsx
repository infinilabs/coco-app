import {
  useEffect,
  useRef,
  useCallback,
  useReducer,
  Suspense,
  memo,
  useState,
  useMemo,
} from "react";
import clsx from "clsx";
import { useMount } from "ahooks";

import Search from "@/components/Search/Search";
import InputBox from "@/components/Search/InputBox";
import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import { isLinux, isWin } from "@/utils/platform";
import { appReducer, initialAppState } from "@/reducers/appReducer";
import { useWindowEvents } from "@/hooks/useWindowEvents";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import platformAdapter from "@/utils/platformAdapter";
import { useStartupStore } from "@/stores/startupStore";
import { useThemeStore } from "@/stores/themeStore";
import { useConnectStore } from "@/stores/connectStore";
import { useAppearanceStore } from "@/stores/appearanceStore";
import type { StartPage } from "@/types/chat";

interface SearchChatProps {
  isTauri?: boolean;
  hasModules?: string[];
  defaultModule?: "search" | "chat";

  showChatHistory?: boolean;

  theme?: "auto" | "light" | "dark";
  searchPlaceholder?: string;
  chatPlaceholder?: string;

  setIsPinned?: (value: boolean) => void;
  onModeChange?: (isChatMode: boolean) => void;
  isMobile?: boolean;
  assistantIDs?: string[];
  startPage?: StartPage;
  formatUrl?: (item: any) => string;
}

function SearchChat({
  isTauri = true,
  hasModules = ["search", "chat"],
  defaultModule = "search",
  theme,
  searchPlaceholder,
  chatPlaceholder,
  showChatHistory = true,
  setIsPinned,
  onModeChange,
  isMobile = false,
  assistantIDs,
  startPage,
  formatUrl,
}: SearchChatProps) {
  const currentAssistant = useConnectStore((state) => state.currentAssistant);

  const source = currentAssistant?._source;

  const customInitialState = useMemo(
    () => ({
      ...initialAppState,
      isDeepThinkActive: source?.type === "deep_think",
      isSearchActive: source?.datasource?.enabled_by_default === true,
      isMCPActive: source?.mcp_servers?.enabled_by_default === true,
    }),
    [source]
  );

  const [state, dispatch] = useReducer(appReducer, customInitialState);
  const {
    isChatMode,
    input,
    isTransitioned,
    isSearchActive,
    isDeepThinkActive,
    isMCPActive,
    isTyping,
  } = state;
  useEffect(() => {
    dispatch({
      type: "SET_SEARCH_ACTIVE",
      payload: customInitialState.isSearchActive,
    });
    dispatch({
      type: "SET_DEEP_THINK_ACTIVE",
      payload: customInitialState.isDeepThinkActive,
    });
    dispatch({
      type: "SET_MCP_ACTIVE",
      payload: customInitialState.isMCPActive,
    });
  }, [customInitialState]);

  const [isWin10, setIsWin10] = useState(false);
  const blurred = useAppStore((state) => state.blurred);

  useWindowEvents();

  const initializeListeners_auth = useAuthStore((state) => {
    return state.initializeListeners;
  });

  const setTheme = useThemeStore((state) => state.setTheme);
  const setIsDark = useThemeStore((state) => state.setIsDark);

  const isChatModeRef = useRef(false);
  useEffect(() => {
    isChatModeRef.current = isChatMode;
  }, [isChatMode]);

  useMount(async () => {
    const isWin10 = await platformAdapter.isWindows10();

    setIsWin10(isWin10);
  });

  useEffect(() => {
    const init = async () => {
      await initializeListeners_auth();
      await platformAdapter.invokeBackend("get_app_search_source");
    };

    init();
  }, []);

  useEffect(() => {
    if (!theme) return;

    setIsDark(theme === "dark");
    setTheme(theme);
  }, [theme]);

  const chatAIRef = useRef<ChatAIRef>(null);

  const changeMode = useCallback(async (value: boolean) => {
    dispatch({ type: "SET_CHAT_MODE", payload: value });
    onModeChange?.(value);
  }, []);

  const handleSendMessage = useCallback(
    async (value: string) => {
      dispatch({ type: "SET_INPUT", payload: value });
      if (isChatMode) {
        chatAIRef.current?.init(value);
      }
    },
    [isChatMode]
  );

  const cancelChat = useCallback(() => {
    chatAIRef.current?.cancelChat();
  }, []);

  const setInput = useCallback((value: string) => {
    dispatch({ type: "SET_INPUT", payload: value });
  }, []);

  const toggleSearchActive = useCallback(() => {
    dispatch({ type: "TOGGLE_SEARCH_ACTIVE" });
  }, []);

  const toggleDeepThinkActive = useCallback(() => {
    dispatch({ type: "TOGGLE_DEEP_THINK_ACTIVE" });
  }, []);

  const toggleMCPActive = useCallback(() => {
    dispatch({ type: "TOGGLE_MCP_ACTIVE" });
  }, []);

  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full">loading...</div>
  );

  const getFileUrl = useCallback((path: string) => {
    return platformAdapter.convertFileSrc(path);
  }, []);

  const setupWindowFocusListener = useCallback(async (callback: () => void) => {
    return platformAdapter.listenEvent("tauri://focus", callback);
  }, []);

  const checkScreenPermission = useCallback(async () => {
    return platformAdapter.checkScreenRecordingPermission();
  }, []);

  const requestScreenPermission = useCallback(() => {
    return platformAdapter.requestScreenRecordingPermission();
  }, []);

  const getScreenMonitors = useCallback(async () => {
    return platformAdapter.getScreenshotableMonitors();
  }, []);

  const getScreenWindows = useCallback(async () => {
    return platformAdapter.getScreenshotableWindows();
  }, []);

  const captureMonitorScreenshot = useCallback(async (id: number) => {
    return platformAdapter.captureMonitorScreenshot(id);
  }, []);

  const captureWindowScreenshot = useCallback(async (id: number) => {
    return platformAdapter.captureWindowScreenshot(id);
  }, []);

  const openFileDialog = useCallback(async (options: { multiple: boolean }) => {
    return platformAdapter.openFileDialog(options);
  }, []);

  const getFileMetadata = useCallback(async (path: string) => {
    return platformAdapter.getFileMetadata(path);
  }, []);

  const getFileIcon = useCallback(async (path: string, size: number) => {
    return platformAdapter.getFileIcon(path, size);
  }, []);

  const defaultStartupWindow = useStartupStore((state) => {
    return state.defaultStartupWindow;
  });

  const opacity = useAppearanceStore((state) => state.opacity);

  useEffect(() => {
    if (isTauri) {
      changeMode(defaultStartupWindow === "chatMode");
    } else {
      if (hasModules?.length > 1) {
        changeMode(defaultModule === "chat");
      } else {
        changeMode(hasModules?.includes("chat") ?? false);
      }
    }
  }, []);

  return (
    <div
      data-tauri-drag-region={isTauri}
      className={clsx(
        "m-auto overflow-hidden relative bg-no-repeat bg-cover bg-center bg-white dark:bg-black flex flex-col",
        [
          isTransitioned
            ? "bg-chat_bg_light dark:bg-chat_bg_dark"
            : "bg-search_bg_light dark:bg-search_bg_dark",
        ],
        {
          "size-full": !isTauri,
          "w-screen h-screen": isTauri,
          "rounded-xl": !isMobile && !isWin,
          "border border-[#E6E6E6] dark:border-[#272626]": isTauri && isLinux,
          "border-t border-t-[#999] dark:border-t-[#333]": isTauri && isWin10,
        }
      )}
      style={{ opacity: blurred ? (opacity ?? 30) / 100 : 1 }}
    >
      <div
        data-tauri-drag-region={isTauri}
        className={clsx("flex-1 w-full overflow-auto", {
          hidden: !isTransitioned,
        })}
      >
        <Suspense fallback={<LoadingFallback />}>
          <ChatAI
            ref={chatAIRef}
            key="ChatAI"
            changeInput={setInput}
            isSearchActive={isSearchActive}
            isDeepThinkActive={isDeepThinkActive}
            isMCPActive={isMCPActive}
            getFileUrl={getFileUrl}
            showChatHistory={showChatHistory}
            assistantIDs={assistantIDs}
            startPage={startPage}
          />
        </Suspense>
      </div>

      <div
        data-tauri-drag-region={isTauri}
        className={`p-2 w-full flex justify-center transition-all duration-500 min-h-[82px] ${
          isTransitioned ? "border-t" : "border-b"
        } border-[#E6E6E6] dark:border-[#272626]`}
      >
        <InputBox
          isChatMode={isChatMode}
          inputValue={input}
          onSend={handleSendMessage}
          disabled={isTyping}
          disabledChange={cancelChat}
          changeMode={changeMode}
          changeInput={setInput}
          isSearchActive={isSearchActive}
          setIsSearchActive={toggleSearchActive}
          isDeepThinkActive={isDeepThinkActive}
          setIsDeepThinkActive={toggleDeepThinkActive}
          isMCPActive={isMCPActive}
          setIsMCPActive={toggleMCPActive}
          setupWindowFocusListener={setupWindowFocusListener}
          checkScreenPermission={checkScreenPermission}
          requestScreenPermission={requestScreenPermission}
          getScreenMonitors={getScreenMonitors}
          getScreenWindows={getScreenWindows}
          captureMonitorScreenshot={captureMonitorScreenshot}
          captureWindowScreenshot={captureWindowScreenshot}
          openFileDialog={openFileDialog}
          getFileMetadata={getFileMetadata}
          getFileIcon={getFileIcon}
          hasModules={hasModules}
          searchPlaceholder={searchPlaceholder}
          chatPlaceholder={chatPlaceholder}
        />
      </div>

      <div
        data-tauri-drag-region={isTauri}
        className={clsx("flex-1 w-full overflow-auto", {
          hidden: isTransitioned,
        })}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Search
            key="Search"
            input={input}
            isChatMode={isChatMode}
            changeInput={setInput}
            setIsPinned={setIsPinned}
            changeMode={changeMode}
            formatUrl={formatUrl}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default memo(SearchChat);
