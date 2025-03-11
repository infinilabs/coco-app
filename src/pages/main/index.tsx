import { useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import clsx from "clsx";

import InputBox from "@/components/Search/InputBox";
import Search from "@/components/Search/Search";
import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { isLinux, isWin } from "@/utils/platform";
import UpdateApp from "@/components/UpdateApp";

export default function DesktopApp() {
  const initializeListeners = useAppStore((state) => state.initializeListeners);
  const initializeListeners_auth = useAuthStore(
    (state) => state.initializeListeners
  );

  const isPinned = useAppStore((state) => state.isPinned);

  useEffect(() => {
    invoke("get_app_search_source");
  }, []);

  useEffect(() => {
    initializeListeners();
    initializeListeners_auth();

    // Listen for window focus and blur events
    const handleBlur = async () => {
      console.log("Window blurred");
      if (isPinned) {
        return;
      }

      // invoke("hide_coco").then(() => {
      //   console.log("Hide Coco");
      // });
    };

    const handleFocus = () => {
      // Optionally, show the window if needed when focus is regained
      // console.log("Window focused");
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isPinned]);

  const chatAIRef = useRef<ChatAIRef>(null);

  const [isChatMode, setIsChatMode] = useState(false);
  const [input, setInput] = useState("");
  const [isTransitioned, setIsTransitioned] = useState(false);

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);

  async function changeMode(value: boolean) {
    setIsChatMode(value);
    setIsTransitioned(value);
  }

  function changeInput(value: string) {
    setInput(value);
  }

  const handleSendMessage = async (value: string) => {
    setInput(value);
    if (isChatMode) {
      if (isTauri()) {
        await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 596));
      }
      chatAIRef.current?.init(value);
    }
  };
  const cancelChat = () => {
    chatAIRef.current?.cancelChat();
  };

  const reconnect = () => {
    chatAIRef.current?.reconnect();
  };
  const isTyping = false;

  return (
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
          changeInput={changeInput}
          reconnect={reconnect}
          isSearchActive={isSearchActive}
          setIsSearchActive={() => setIsSearchActive((prev) => !prev)}
          isDeepThinkActive={isDeepThinkActive}
          setIsDeepThinkActive={() => setIsDeepThinkActive((prev) => !prev)}
        />
      </div>

      <div
        data-tauri-drag-region
        className={`absolute w-full transition-opacity duration-500 ${
          isTransitioned ? "opacity-0 pointer-events-none" : "opacity-100"
        } bottom-0 h-[calc(100vh-90px)] `}
      >
        <Search
          key="Search"
          input={input}
          isChatMode={isChatMode}
          changeInput={changeInput}
        />
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
          <ChatAI
            ref={chatAIRef}
            key="ChatAI"
            isTransitioned={isTransitioned}
            changeInput={changeInput}
            isSearchActive={isSearchActive}
            isDeepThinkActive={isDeepThinkActive}
          />
        ) : null}
      </div>

      <UpdateApp />
    </div>
  );
}
