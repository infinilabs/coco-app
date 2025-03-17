import {
  useEffect,
  useRef,
  useCallback,
  useReducer,
  Suspense,
  lazy,
  memo,
} from "react";
import clsx from "clsx";

import ErrorBoundary from "@/components/Common/ErrorBoundary";
import InputBox from "@/components/Search/InputBox";
import { ChatAIRef } from "@/components/Assistant/Chat";
import UpdateApp from "@/components/UpdateApp";
import { isLinux, isWin } from "@/utils/platform";
import { appReducer, initialAppState } from "@/reducers/appReducer";
import { useWindowEvents } from "@/hooks/useWindowEvents";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import platformAdapter from "@/utils/platformAdapter";
import { DataSource } from "@/components/Assistant/types";
import { useStartupStore } from "@/stores/startupStore";

const Search = lazy(() => import("@/components/Search/Search"));
const ChatAI = lazy(() => import("@/components/Assistant/Chat"));

interface SearchChatProps {
  querySearch: (input: string) => Promise<any>;
  queryDocuments: (
    from: number,
    size: number,
    queryStrings: any
  ) => Promise<any>;
}

function SearchChat({ querySearch, queryDocuments }: SearchChatProps) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const {
    isChatMode,
    input,
    isTransitioned,
    isSearchActive,
    isDeepThinkActive,
    isTyping,
  } = state;

  useWindowEvents();

  const initializeListeners = useAppStore((state) => state.initializeListeners);
  const initializeListeners_auth = useAuthStore(
    (state) => state.initializeListeners
  );

  useEffect(() => {
    initializeListeners();
    initializeListeners_auth();
    platformAdapter.invokeBackend("get_app_search_source");
  }, []);

  const chatAIRef = useRef<ChatAIRef>(null);

  const changeMode = useCallback(async (value: boolean) => {
    dispatch({ type: "SET_CHAT_MODE", payload: value });
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

  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full">loading...</div>
  );

  const hideCoco = useCallback(() => {
    return platformAdapter.hideWindow();
  }, []);

  const getFileUrl = useCallback((path: string) => {
    return platformAdapter.convertFileSrc(path);
  }, []);

  const openSetting = useCallback(() => {
    return platformAdapter.emitEvent("open_settings", "");
  }, []);

  const setWindowAlwaysOnTop = useCallback(async (isPinned: boolean) => {
    return platformAdapter.setAlwaysOnTop(isPinned);
  }, []);

  const getDataSourcesByServer = useCallback(
    async (serverId: string): Promise<DataSource[]> => {
      return platformAdapter.invokeBackend("get_datasources_by_server", {
        id: serverId,
      });
    },
    []
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
  const setDefaultStartupWindow = useStartupStore((state) => {
    return state.setDefaultStartupWindow;
  });
  
  const showCocoListenRef = useRef<(() => void) | undefined>();
  
  useEffect(() => {
    let unlistenChangeStartupStore: (() => void) | undefined;
  
    const setupListener = async () => {
      try {
        unlistenChangeStartupStore = await platformAdapter.listenEvent(
          "change-startup-store",
          ({ payload }) => {
            if (payload && typeof payload === 'object' && 'defaultStartupWindow' in payload) {
              const startupWindow = payload.defaultStartupWindow;
              if (startupWindow === "searchMode" || startupWindow === "chatMode") {
                setDefaultStartupWindow(startupWindow);
              }
            }
          }
        );
      } catch (error) {
        console.error("Error setting up change-startup-store listener:", error);
      }
    };
  
    setupListener();
  
    return () => {
      if (unlistenChangeStartupStore) {
        unlistenChangeStartupStore();
      }
    };
  }, []);
  
  useEffect(() => {
    const setupShowCocoListener = async () => {
      if (showCocoListenRef.current) {
        showCocoListenRef.current();
        showCocoListenRef.current = undefined;
      }
      
      try {
        const unlisten = await platformAdapter.listenEvent("show-coco", () => {
          changeMode(defaultStartupWindow === "chatMode");
        });
        
        showCocoListenRef.current = unlisten;
      } catch (error) {
        console.error("Error setting up show-coco listener:", error);
      }
    };
    
    setupShowCocoListener();
    
    return () => {
      if (showCocoListenRef.current) {
        showCocoListenRef.current();
        showCocoListenRef.current = undefined;
      }
    };
  }, [defaultStartupWindow, changeMode]);


  return (
    <ErrorBoundary>
      <div
        data-tauri-drag-region
        className={clsx(
          "size-full m-auto overflow-hidden relative bg-no-repeat bg-cover bg-center",
          [
            isTransitioned
              ? "bg-chat_bg_light dark:bg-chat_bg_dark"
              : "bg-search_bg_light dark:bg-search_bg_dark",
          ],
          {
            "rounded-xl": !isWin,
            "border border-[#E6E6E6] dark:border-[#272626]": isLinux,
          }
        )}
      >
        <div
          data-tauri-drag-region
          className={`p-2 pb-0 absolute w-full flex items-center justify-center transition-all duration-500 ${
            isTransitioned
              ? "top-[calc(100vh-90px)] h-[90px] border-t"
              : "top-0 h-[90px] border-b"
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
            getDataSourcesByServer={getDataSourcesByServer}
            setupWindowFocusListener={setupWindowFocusListener}
            hideCoco={hideCoco}
            checkScreenPermission={checkScreenPermission}
            requestScreenPermission={requestScreenPermission}
            getScreenMonitors={getScreenMonitors}
            getScreenWindows={getScreenWindows}
            captureMonitorScreenshot={captureMonitorScreenshot}
            captureWindowScreenshot={captureWindowScreenshot}
            openFileDialog={openFileDialog}
            getFileMetadata={getFileMetadata}
            getFileIcon={getFileIcon}
          />
        </div>

        <div
          data-tauri-drag-region
          className={`absolute w-full transition-opacity duration-500 ${
            isTransitioned ? "opacity-0 pointer-events-none" : "opacity-100"
          } bottom-0 h-[calc(100vh-90px)] `}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Search
              key="Search"
              input={input}
              isChatMode={isChatMode}
              changeInput={setInput}
              querySearch={querySearch}
              queryDocuments={queryDocuments}
              hideCoco={hideCoco}
              openSetting={openSetting}
              setWindowAlwaysOnTop={setWindowAlwaysOnTop}
            />
          </Suspense>
        </div>

        <div
          data-tauri-drag-region
          className={`absolute w-full transition-all duration-500 select-auto ${
            isTransitioned
              ? "top-0 opacity-100 pointer-events-auto"
              : "-top-[506px] opacity-0 pointer-events-none"
          } h-[calc(100vh-90px)]`}
        >
          {isTransitioned && isChatMode ? (
            <Suspense fallback={<LoadingFallback />}>
              <ChatAI
                ref={chatAIRef}
                key="ChatAI"
                isTransitioned={isTransitioned}
                changeInput={setInput}
                isSearchActive={isSearchActive}
                isDeepThinkActive={isDeepThinkActive}
                getFileUrl={getFileUrl}
              />
            </Suspense>
          ) : null}
        </div>

        <UpdateApp checkUpdate={checkUpdate} relaunchApp={relaunchApp} />
      </div>
    </ErrorBoundary>
  );
}

export default memo(SearchChat);
