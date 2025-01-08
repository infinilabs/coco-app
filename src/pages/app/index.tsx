import { useState, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";

import InputBox from "@/components/AppAI/InputBox";
import Search from "@/components/AppAI/Search";
import ChatAI, { ChatAIRef } from "@/components/ChatAI/Chat";

export default function DesktopApp() {
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
        const { getCurrentWebviewWindow } = await import(
          "@tauri-apps/api/webviewWindow"
        );
        const { LogicalSize } = await import("@tauri-apps/api/dpi");

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
      className={`w-[680px] h-[590px] m-auto rounded-xl overflow-hidden relative border border-[#E6E6E6] dark:border-[#272626] ${
        isTransitioned
          ? "bg-chat_bg_light dark:bg-chat_bg_dark"
          : "bg-search_bg_light dark:bg-search_bg_dark"
      } bg-no-repeat bg-cover bg-center`}
    >
      <div
        data-tauri-drag-region
        className={`p-[7px] pb-0 absolute w-full flex items-center justify-center transition-all duration-500 ${
          isTransitioned
            ? "top-[500px] h-[90px] border-t"
            : "top-0 h-[90px] border-b"
        } border-[#E6E6E6] dark:border-[#272626] `}
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
        } bottom-0 h-[500px]`}
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
        {isTransitioned ? (
          <ChatAI
            ref={chatAIRef}
            key="ChatAI"
            inputValue={input}
            isTransitioned={isTransitioned}
            changeInput={changeInput}
          />
        ) : null}
      </div>
    </div>
  );
}
