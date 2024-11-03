import { useState, Fragment } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";

import Search from "./Search";
import ChatAI from "../ChatAI";

export default function SearchChat() {
  const [isChatMode, setIsChatMode] = useState(false);

  async function changeMode(value: boolean) {
    console.log(11111, value);
    if (value) {
      await getCurrentWebviewWindow().setSize(new LogicalSize(900, 700));
    } else {
      await getCurrentWebviewWindow().setSize(new LogicalSize(800, 110));
    }
    setIsChatMode(value);
  }
  return (
    <Fragment>
      {isChatMode ? (
        <ChatAI changeMode={changeMode} />
      ) : (
        <Search changeMode={changeMode} />
      )}
    </Fragment>
  );
}
