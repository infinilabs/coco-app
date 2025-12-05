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
import { useMount, useMutationObserver } from "ahooks";
import { debounce } from "lodash-es";

import Search from "@/components/Search/Search";
import InputBox from "@/components/Search/InputBox";
import ChatAI, {
  ChatAIRef,
  SendMessageParams,
} from "@/components/Assistant/Chat";
import { isLinux, isWin } from "@/utils/platform";
import { appReducer, initialAppState } from "@/reducers/appReducer";
import { useWindowEvents } from "@/hooks/useWindowEvents";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useStartupStore } from "@/stores/startupStore";
import { useThemeStore } from "@/stores/themeStore";
import { useConnectStore } from "@/stores/connectStore";
import { useAppearanceStore } from "@/stores/appearanceStore";
import type { StartPage } from "@/types/chat";
import {
  canNavigateBack,
  hasUploadingAttachment,
  visibleFilterBar,
  visibleSearchBar,
} from "@/utils";
import { useTauriFocus } from "@/hooks/useTauriFocus";
import { POPOVER_PANEL_SELECTOR, WINDOW_CENTER_BASELINE_HEIGHT } from "@/constants";
import { useChatStore } from "@/stores/chatStore";
import { useSearchStore } from "@/stores/searchStore";

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

  const inputRef = useRef<string>();
  const isChatModeRef = useRef(false);
  const [hideMiddleBorder, setHideMiddleBorder] = useState(false);

  const setSuppressErrors = useAppStore((state) => state.setSuppressErrors);
  let collapseWindowTimer = useRef<ReturnType<typeof setTimeout>>();

  const setWindowSize = useCallback(() => {
    if (collapseWindowTimer.current) {
      clearTimeout(collapseWindowTimer.current);
    }

    const width = 680;
    let height = WINDOW_CENTER_BASELINE_HEIGHT;

    const updateAppDialog = document.querySelector("#update-app-dialog");
    const popoverPanelEl = document.querySelector(POPOVER_PANEL_SELECTOR);

    const { hasActiveChat } = useChatStore.getState();

    if (
      updateAppDialog ||
      canNavigateBack() ||
      inputRef.current ||
      popoverPanelEl ||
      (isChatModeRef.current && hasActiveChat)
    ) {
      setHideMiddleBorder(false);
      setSuppressErrors(false);
    } else {
      const { windowMode } = useAppearanceStore.getState();

      if (windowMode === "compact") {
        height = 84;
      }
    }

    if (height < WINDOW_CENTER_BASELINE_HEIGHT) {
      const { compactModeAutoCollapseDelay } = useConnectStore.getState();

      collapseWindowTimer.current = setTimeout(() => {
        setHideMiddleBorder(true);
        setSuppressErrors(true);

        const textarea = document.querySelector(".auto-resize-textarea");

        if (textarea instanceof HTMLTextAreaElement) {
          textarea.focus();
        }

        platformAdapter.setWindowSize(width, height);
      }, compactModeAutoCollapseDelay * 1000);
    } else {
      platformAdapter.setWindowSize(width, height);
    }
  }, []);

  const debouncedSetWindowSize = debounce(setWindowSize, 50);

  useMutationObserver(debouncedSetWindowSize, document.body, {
    subtree: true,
    childList: true,
  });

  useEffect(() => {
    inputRef.current = input;
    isChatModeRef.current = isChatMode;

    debouncedSetWindowSize();
  }, [input, isChatMode]);

  useTauriFocus({
    onFocus: debouncedSetWindowSize,
  });

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

  const setTheme = useThemeStore((state) => state.setTheme);
  const setIsDark = useThemeStore((state) => state.setIsDark);

  useMount(async () => {
    const isWin10 = await platformAdapter.isWindows10();

    setIsWin10(isWin10);
  });

  useEffect(() => {
    const init = async () => {
      if (isTauri) {
        await platformAdapter.commands("get_app_search_source");
      }
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
    async (params: SendMessageParams) => {
      if (hasUploadingAttachment()) return;

      dispatch({ type: "SET_INPUT", payload: params?.message ?? "" });
      if (isChatMode) {
        const { setHasActiveChat } = useChatStore.getState();
        setHasActiveChat(true);
        chatAIRef.current?.init(params);
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

  const { normalOpacity, blurOpacity } = useAppearanceStore();

  useEffect(() => {
    const unlistenAsk = platformAdapter.listenEvent(
      "selection-ask-ai",
      ({ payload }: any) => {
        const value =
          typeof payload === "string" ? payload : String(payload?.text ?? "");
        dispatch({ type: "SET_CHAT_MODE", payload: true });
        dispatch({ type: "SET_INPUT", payload: value });
        platformAdapter.showWindow();
      }
    );

    const unlistenAction = platformAdapter.listenEvent(
      "selection-action",
      ({ payload }: any) => {
        const { action, text, assistantId, serverId } = payload || {};
        const value = String(text ?? "");

        //
        if (action === "search") {
          dispatch({ type: "SET_CHAT_MODE", payload: false });
          dispatch({ type: "SET_INPUT", payload: value });
          const { setSearchValue } = useSearchStore.getState();
          setSearchValue(value);
        } else if (action === "chat") {
          dispatch({ type: "SET_CHAT_MODE", payload: true });
          dispatch({ type: "SET_INPUT", payload: value });
          //
          const { setTargetServerId, setTargetAssistantId } =
            useSearchStore.getState();

          if (serverId) {
            setTargetServerId(serverId);
          }

          const { assistantList } = useConnectStore.getState();
          const assistant = assistantList.find(
            (item) => item._source?.id === assistantId
          );
          if (assistant) {
            setTargetAssistantId(assistant._id);
          }
        }
      }
    );

    return () => {
      unlistenAsk.then((fn) => fn());
      unlistenAction.then((fn) => fn());
    };
  }, []);

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
        "m-auto overflow-hidden relative bg-no-repeat bg-white dark:bg-black flex flex-col",
        [
          isTransitioned
            ? "bg-bottom bg-chat_bg_light dark:bg-chat_bg_dark"
            : "bg-top bg-search_bg_light dark:bg-search_bg_dark",
        ],
        {
          "size-full": !isTauri,
          "w-screen h-screen": isTauri,
          "rounded-xl": !isMobile && !isWin,
          "border border-[#E6E6E6] dark:border-[#272626]": isTauri && isLinux,
          "border-t border-t-[#999] dark:border-t-[#333]": isTauri && isWin10,
        }
      )}
      style={{
        backgroundSize: "auto 590px",
        opacity: blurred ? blurOpacity / 100 : normalOpacity / 100,
      }}
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
            instanceId="search-chat"
            changeInput={setInput}
            isSearchActive={isSearchActive}
            isDeepThinkActive={isDeepThinkActive}
            isMCPActive={isMCPActive}
            getFileUrl={getFileUrl}
            showChatHistory={showChatHistory}
            assistantIDs={assistantIDs}
            startPage={startPage}
            formatUrl={formatUrl}
          />
        </Suspense>
      </div>

      <div
        data-tauri-drag-region={isTauri}
        className={clsx(
          "relative p-2 w-full flex justify-center transition-all duration-500",
          {
            "min-h-[84px]": visibleSearchBar() && visibleFilterBar(),
          }
        )}
      >
        {!hideMiddleBorder && (
          <div
            className={clsx(
              "pointer-events-none absolute left-0 right-0 h-[1px] bg-[#E6E6E6] dark:bg-[#272626]",
              isTransitioned ? "top-0" : "bottom-0"
            )}
          />
        )}

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
