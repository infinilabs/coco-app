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
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { isLinux, isWin } from "@/utils/platform";
import platformAdapter from "@/utils/platformAdapter";
import { useWindowEvents } from "@/hooks/useWindowEvents";
import { appReducer, initialAppState } from "@/reducers/appReducer";

const Search = lazy(() => import("@/components/Search/Search"));
const ChatAI = lazy(() => import("@/components/Assistant/Chat"));

function WebApp() {
  useWindowEvents();

  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const {
    isChatMode,
    input,
    isTransitioned,
    isSearchActive,
    isDeepThinkActive,
    isTyping,
  } = state;

  const initializeListeners = useAppStore((state) => state.initializeListeners);
  const initializeListeners_auth = useAuthStore(
    (state) => state.initializeListeners
  );

  useEffect(() => {
    platformAdapter.invokeBackend("get_app_search_source");
  }, []);

  useEffect(() => {
    initializeListeners();
    initializeListeners_auth();
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
              />
            </Suspense>
          ) : null}
        </div>

        <UpdateApp />
      </div>
    </ErrorBoundary>
  );
}

export default memo(WebApp);
