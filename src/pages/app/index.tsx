import { useState, useRef, useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";

import InputBox from "@/components/AppAI/InputBox";
import Search from "@/components/AppAI/Search";
import ChatAI, { ChatAIRef } from "@/components/ChatAI/Chat";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { tauriFetch } from "@/api/tauriFetchClient";
import ApiDetails from "@/components/AppAI/ApiDetails";
import { useConnectStore } from "@/stores/connectStore";

export default function DesktopApp() {
  const initializeListeners = useAppStore((state) => state.initializeListeners);
  const initializeListeners_auth = useAuthStore(
    (state) => state.initializeListeners
  );
  const setConnectorData = useConnectStore((state) => state.setConnectorData);
  const setDatasourceData = useConnectStore((state) => state.setDatasourceData);

  const endpoint_http = useAppStore((state) => state.endpoint_http);

  useEffect(() => {
    initializeListeners();
    initializeListeners_auth();

    getConnectorData();
    getDatasourceData();
  }, []);

  async function getConnectorData() {
    try {
      const response = await tauriFetch({
        url: `/connector/_search`,
        method: "GET",
      });
      console.log("connector", response);
      const data = response.data?.hits?.hits || [];
      setConnectorData(data, endpoint_http);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }
  
  async function getDatasourceData() {
    try {
      const response = await tauriFetch({
        url: `/datasource/_search`,
        method: "GET",
      });
      console.log("datasource", response);
      const data = response.data?.hits?.hits || [];
      setDatasourceData(data, endpoint_http);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }

  const chatAIRef = useRef<ChatAIRef>(null);

  const [isChatMode, setIsChatMode] = useState(false);
  const [input, setInput] = useState("");
  const [isTransitioned, setIsTransitioned] = useState(false);

  async function changeMode(value: boolean) {
    setIsChatMode(value);
    setIsTransitioned(value);
  }

  async function changeInput(value: string) {
    setInput(value);
  }

  const handleSendMessage = async (value: string) => {
    setInput(value);
    if (isChatMode) {
      if (isTauri()) {
        await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 596));
      }
      chatAIRef.current?.init();
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
      className={`w-full h-full m-auto rounded-xl overflow-hidden relative border border-[#E6E6E6] dark:border-[#272626] ${
        isTransitioned
          ? "bg-chat_bg_light dark:bg-chat_bg_dark"
          : "bg-search_bg_light dark:bg-search_bg_dark"
      } bg-no-repeat bg-cover bg-center`}
    >
      <div
        data-tauri-drag-region
        className={`p-2 pb-0 absolute w-full flex items-center justify-center transition-all duration-500 ${
          isTransitioned
            ? "top-[500px] h-[90px] border-t"
            : "top-0 h-[90px] border-b"
        } border-[#E6E6E6] dark:border-[#272626]`}
      >
        <InputBox
          isChatMode={isChatMode}
          inputValue={input}
          onSend={handleSendMessage}
          disabled={isTyping}
          disabledChange={() => {
            cancelChat();
          }}
          changeMode={changeMode}
          changeInput={changeInput}
          reconnect={reconnect}
        />
      </div>

      <div
        data-tauri-drag-region
        className={`absolute w-full transition-opacity duration-500 ${
          isTransitioned ? "opacity-0 pointer-events-none" : "opacity-100"
        } bottom-0 h-[500px] `}
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
        className={`absolute w-full transition-all duration-500 ${
          isTransitioned
            ? "top-0 opacity-100 pointer-events-auto"
            : "-top-[506px] opacity-0 pointer-events-none"
        } h-[500px]`}
      >
        {isTransitioned && isChatMode ? (
          <ChatAI
            ref={chatAIRef}
            key="ChatAI"
            inputValue={input}
            isTransitioned={isTransitioned}
            changeInput={changeInput}
          />
        ) : null}
      </div>

      <ApiDetails />
    </div>
  );
}
