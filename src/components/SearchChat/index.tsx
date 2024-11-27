import { useEffect, useState, useRef } from "react";
// import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
// import { LogicalSize } from "@tauri-apps/api/dpi";

import InputBox from "./InputBox";
import Search from "./Search";
import ChatAI, { ChatAIRef } from "../ChatAI/Chat";

export default function SearchChat() {
  const chatAIRef = useRef<ChatAIRef>(null);

  const [isChatMode, setIsChatMode] = useState(false);
  const [input, setInput] = useState("");
  const [isTransitioned, setIsTransitioned] = useState(false);

  async function setWindowSize() {
    if (isTransitioned) {
      // await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 600));
    } else {
      // await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 90));
    }
  }
  useEffect(() => {
    setWindowSize();
  }, [isTransitioned]);

  async function changeMode(value: boolean) {
    setIsChatMode(value);
    if (!value) {
      setIsTransitioned(false);
    }
  }

  async function changeInput(value: string) {
    setInput(value);
  }

  const handleSendMessage = async (value: string) => {
    setInput(value);
    if (isChatMode) {
      setIsTransitioned(true);
      chatAIRef.current?.init();
    }
  };
  const cancelChat = () => {};
  const setIsTyping = (value: any) => {
    console.log(value);
  };
  const isTyping = false;

  return (
    <div
      data-tauri-drag-region
      className={`w-full h-full min-h-screen mx-auto overflow-hidden relative`}
    >
      <div
        className={`rounded-xl overflow-hidden bg-inputbox_bg_light dark:bg-inputbox_bg_dark bg-cover border border-[#E6E6E6] dark:border-[#272626] absolute z-100 w-full flex items-center justify-center duration-500 ${
          isTransitioned ? "top-[506px] h-[90px]" : "top-0 h-[90px]"
        }`}
      >
        <InputBox
          isChatMode={isChatMode}
          inputValue={input}
          onSend={handleSendMessage}
          disabled={isTyping}
          disabledChange={(value) => {
            cancelChat();
            setIsTyping(value);
          }}
          changeMode={changeMode}
          changeInput={changeInput}
        />
      </div>

      <div
        className={`rounded-xl overflow-hidden bg-chat_bg_light dark:bg-chat_bg_dark bg-cover border border-[#E6E6E6] dark:border-[#272626] absolute w-full transition-all duration-500 ${
          isTransitioned
            ? "top-0 opacity-100 pointer-events-auto"
            : "-top-[506px] opacity-0 pointer-events-none"
        } h-[500px]`}
      >
        <ChatAI
          ref={chatAIRef}
          key="ChatAI"
          inputValue={input}
          isTransitioned={isTransitioned}
          changeInput={changeInput}
        />
      </div>

      {isChatMode || !input ? null : (
        <Search
          key="Search"
          input={input}
          isChatMode={isChatMode}
          isTransitioned={isTransitioned}
          changeInput={changeInput}
        />
      )}
    </div>
  );
}
