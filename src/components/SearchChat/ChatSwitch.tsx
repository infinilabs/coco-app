import { useState } from "react";
import Switch from "./Switch";

interface ChatSwitchProps {
  isChat: boolean;
  changeMode: (isChatMode: boolean) => void;
}

export default function ChatSwitch({ isChat, changeMode }: ChatSwitchProps) {
  const [isChatMode, setIsChatMode] = useState(isChat);

  return (
    <div className="flex items-center text-xs">
      <Switch
        checked={isChatMode}
        onChange={(value) => {
          setIsChatMode(value);
          changeMode(value);
        }}
      ></Switch>
    </div>
  );
}
