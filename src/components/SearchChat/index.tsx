import { useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { AnimatePresence, LayoutGroup } from "framer-motion";

import Search from "./Search";
import ChatAI from "../ChatAI/Chat";

export default function SearchChat() {
  const [isChatMode, setIsChatMode] = useState(false);
  const [input, setInput] = useState("");

  async function changeMode(value: boolean) {
    setIsChatMode(value);
    setInput("");
    if (!value) {
      await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 90));
    }
  }

  async function changeInput(value: string) {
    setInput(value);
    if (isChatMode) {
      await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 600));
    }
  }

  return (
    <LayoutGroup>
      <AnimatePresence mode="wait">
        {isChatMode && input ? (
          <ChatAI key="ChatAI" input={input} changeMode={changeMode} />
        ) : (
          <Search
            key="Search"
            isChatMode={isChatMode}
            changeMode={changeMode}
            changeInput={changeInput}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
