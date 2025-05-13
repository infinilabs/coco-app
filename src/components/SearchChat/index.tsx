import {
  useEffect,
  useRef,
  useCallback,
  useReducer,
  Suspense,
  memo,
  useState,
} from "react";
import clsx from "clsx";
import { useMount } from "ahooks";

import Search from "@/components/Search/Search";
import InputBox from "@/components/Search/InputBox";
import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import UpdateApp from "@/components/UpdateApp";
import { isLinux, isWin } from "@/utils/platform";
import { appReducer, initialAppState } from "@/reducers/appReducer";
import { useWindowEvents } from "@/hooks/useWindowEvents";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import platformAdapter from "@/utils/platformAdapter";
import { useStartupStore } from "@/stores/startupStore";
import { DataSource } from "@/types/commands";
import { useThemeStore } from "@/stores/themeStore";
import { Get } from "@/api/axiosRequest";
import { useConnectStore } from "@/stores/connectStore";
import { useAppearanceStore } from "@/stores/appearance";

interface SearchChatProps {
  isTauri?: boolean;
  hasModules?: string[];
  defaultModule?: "search" | "chat";

  showChatHistory?: boolean;

  theme?: "auto" | "light" | "dark";
  searchPlaceholder?: string;
  chatPlaceholder?: string;

  hideCoco?: () => void;
  setIsPinned?: (value: boolean) => void;
  onModeChange?: (isChatMode: boolean) => void;
  isMobile?: boolean;
  assistantIDs?: string[];
}

function SearchChat({
  isTauri = true,
  hasModules = ["search", "chat"],
  defaultModule = "search",
  theme,
  hideCoco,
  searchPlaceholder,
  chatPlaceholder,
  showChatHistory = true,
  setIsPinned,
  onModeChange,
  isMobile = false,
  assistantIDs,
}: SearchChatProps) {
  const currentAssistant = useConnectStore((state) => state.currentAssistant);

  const customInitialState = {
    ...initialAppState,
    isDeepThinkActive: currentAssistant?._source?.type === "deep_think",
    isSearchActive: currentAssistant?._source?.datasource?.enabled === true,
    isMCPActive: currentAssistant?._source?.mcp_servers?.enabled === true,
  };

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
  const [isWin10, setIsWin10] = useState(false);
  const blurred = useAppStore((state) => state.blurred);

  useWindowEvents();

  const initializeListeners = useAppStore((state) => state.initializeListeners);
  const initializeListeners_auth = useAuthStore(
    (state) => state.initializeListeners
  );

  const setTheme = useThemeStore((state) => state.setTheme);

  const isChatModeRef = useRef(false);
  useEffect(() => {
    isChatModeRef.current = isChatMode;
  }, [isChatMode]);

  useMount(async () => {
    const isWin10 = await platformAdapter.isWindows10();

    setIsWin10(isWin10);

    platformAdapter.listenEvent("show-coco", () => {
      console.log("show-coco");

      platformAdapter.invokeBackend("simulate_mouse_click", {
        isChatMode: isChatModeRef.current,
      });
    });
  });

  useEffect(() => {
    const init = async () => {
      await initializeListeners();
      await initializeListeners_auth();
      await platformAdapter.invokeBackend("get_app_search_source");
    };

    init();
  }, []);

  useEffect(() => {
    if (!theme) return;

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

  const reconnect = useCallback(() => {
    chatAIRef.current?.reconnect();
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

  const openSetting = useCallback(() => {
    return platformAdapter.emitEvent("open_settings", "");
  }, []);

  const setWindowAlwaysOnTop = useCallback(async (isPinned: boolean) => {
    setIsPinned && setIsPinned(isPinned);
    return platformAdapter.setAlwaysOnTop(isPinned);
  }, []);
  const snapshotUpdate = useAppearanceStore((state) => state.snapshotUpdate);

  const getDataSourcesByServer = useCallback(
    async (
      serverId: string,
      options?: {
        from?: number;
        size?: number;
        query?: string;
      }
    ): Promise<DataSource[]> => {
      let response: any;
      if (isTauri) {
        response = await platformAdapter.invokeBackend("datasource_search", {
          id: serverId,
          options,
        });
      } else {
        const [error, res]: any = await Get("/datasource/_search");
        if (error) {
          console.error("_search", error);
          return [];
        }
        response = res?.hits?.hits?.map((item: any) => {
          return {
            ...item,
            id: item._source.id,
            name: item._source.name,
          };
        });
      }
      let ids = currentAssistant?._source?.datasource?.ids;
      if (Array.isArray(ids) && ids.length > 0 && !ids.includes("*")) {
        response = response?.filter((item: any) => ids.includes(item.id));
      }
      return response || [];
    },
    [JSON.stringify(currentAssistant)]
  );

  const getMCPByServer = useCallback(
    async (
      serverId: string,
      options?: {
        from?: number;
        size?: number;
        query?: string;
      }
    ): Promise<DataSource[]> => {
      let response: any;
      if (isTauri) {
        response = await platformAdapter.invokeBackend("mcp_server_search", {
          id: serverId,
          options,
        });
      } else {
        const [error, res]: any = await Get("/mcp_server/_search");
        if (error) {
          console.error("_search", error);
          return [];
        }
        response = res?.hits?.hits?.map((item: any) => {
          return {
            ...item,
            id: item._source.id,
            name: item._source.name,
          };
        });
      }
      let ids = currentAssistant?._source?.mcp_servers?.ids;
      if (Array.isArray(ids) && ids.length > 0 && !ids.includes("*")) {
        response = response?.filter((item: any) => ids.includes(item.id));
      }
      return response || [];
    },
    [JSON.stringify(currentAssistant)]
  );

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

  const checkUpdate = useCallback(async () => {
    return platformAdapter.checkUpdate();
  }, []);

  const relaunchApp = useCallback(async () => {
    return platformAdapter.relaunchApp();
  }, []);

  const defaultStartupWindow = useStartupStore((state) => {
    return state.defaultStartupWindow;
  });
  const opacity = useAppearanceStore((state) => state.opacity);

  useEffect(() => {
    if (platformAdapter.isTauri()) {
      changeMode(defaultStartupWindow === "chatMode");
    } else {
      if (hasModules?.length === 1 && hasModules?.includes("chat")) {
        changeMode(true);
      } else {
        changeMode(defaultModule === "chat");
      }
    }
  }, []);

  useEffect(() => {
    if (!snapshotUpdate) return;

    checkUpdate();
  }, [snapshotUpdate]);

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
      style={{ opacity: blurred ? opacity / 100 : 1 }}
    >
      {isTransitioned && (
        <div
          data-tauri-drag-region={isTauri}
          className="flex-1 w-full overflow-hidden"
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
            />
          </Suspense>
        </div>
      )}

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
          reconnect={reconnect}
          isSearchActive={isSearchActive}
          setIsSearchActive={toggleSearchActive}
          isDeepThinkActive={isDeepThinkActive}
          setIsDeepThinkActive={toggleDeepThinkActive}
          isMCPActive={isMCPActive}
          setIsMCPActive={toggleMCPActive}
          getDataSourcesByServer={getDataSourcesByServer}
          getMCPByServer={getMCPByServer}
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
          hideCoco={hideCoco}
        />
      </div>

      {!isTransitioned && (
        <div
          data-tauri-drag-region={isTauri}
          className="flex-1 overflow-auto w-full"
        >
          <Suspense fallback={<LoadingFallback />}>
            <Search
              key="Search"
              isTauri={isTauri}
              input={input}
              isChatMode={isChatMode}
              changeInput={setInput}
              hideCoco={hideCoco}
              openSetting={openSetting}
              setWindowAlwaysOnTop={setWindowAlwaysOnTop}
            />
          </Suspense>
        </div>
      )}

      <UpdateApp checkUpdate={checkUpdate} relaunchApp={relaunchApp} />
    </div>
  );
}

export default memo(SearchChat);
