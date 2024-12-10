import { useEffect, useState, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";

// import { Window, LogicalPosition } from "@tauri-apps/api/window";
// import { currentMonitor } from "@tauri-apps/plugin-window";

import InputBox from "./InputBox";
import Search from "./Search";
import ChatAI, { ChatAIRef } from "../ChatAI/Chat";

// const appWindow = new Window("main");

// async function preventOutOfBounds() {
//   const monitor = await currentMonitor();

//   if (monitor) {
//     const screenBounds = {
//       x: monitor.position.x,
//       y: monitor.position.y,
//       width: monitor.size.width,
//       height: monitor.size.height,
//     };

//     const windowPosition = await appWindow.outerPosition();
//     const windowSize = await appWindow.outerSize();

//     let newX = windowPosition.x;
//     let newY = windowPosition.y;

//     if (newX < screenBounds.x) newX = screenBounds.x;
//     if (newY < screenBounds.y) newY = screenBounds.y;
//     if (newX + windowSize.width > screenBounds.x + screenBounds.width)
//       newX = screenBounds.x + screenBounds.width - windowSize.width;
//     if (newY + windowSize.height > screenBounds.y + screenBounds.height)
//       newY = screenBounds.y + screenBounds.height - windowSize.height;

//     if (newX !== windowPosition.x || newY !== windowPosition.y) {
//       await appWindow.setPosition(new LogicalPosition(newX, newY));
//     }
//   }
// }

export default function SearchChat() {
  const chatAIRef = useRef<ChatAIRef>(null);

  const [isChatMode, setIsChatMode] = useState(false);
  const [input, setInput] = useState("");
  const [isTransitioned, setIsTransitioned] = useState(false);

  // useEffect(() => {
  //   const unlisten = appWindow.listen("tauri://move", () => {
  //     preventOutOfBounds();
  //   });

  //   return () => {
  //     unlisten.then((off: any) => off());
  //   };
  // }, []);

  async function setWindowSize() {
    if (isTauri() && !isTransitioned) {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { LogicalSize } = await import("@tauri-apps/api/dpi");

      setTimeout(async () => {
        await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 90));
      }, 1000);
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
      if (isTauri()) {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const { LogicalSize } = await import("@tauri-apps/api/dpi");
        
        await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 596));
      }
      setIsTransitioned(true);
      chatAIRef.current?.init();
    }
  };
  const cancelChat = () => {
    chatAIRef.current?.cancelChat();
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
          disabledChange={() => {
            cancelChat();
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

      {isChatMode ? null : (
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
