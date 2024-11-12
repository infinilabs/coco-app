import { useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { AnimatePresence, LayoutGroup } from "framer-motion";

import Search from "./Search";
import ChatAI from "../ChatAI";

export default function SearchChat() {
  const [isChatMode, setIsChatMode] = useState(true);

  async function changeMode(value: boolean) {
    setIsChatMode(value);
    if (value) {
      await getCurrentWebviewWindow()?.setSize(new LogicalSize(900, 800));
    } else {
      await getCurrentWebviewWindow()?.setSize(new LogicalSize(900, 110));
    }
  }
  return (
    <LayoutGroup>
      <AnimatePresence mode="wait">
        {isChatMode ? (
          <ChatAI key="ChatAI" changeMode={changeMode} />
        ) : (
          <Search key="Search" changeMode={changeMode} />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
