import { useState } from "react";
import { Switch } from "@headlessui/react";

interface ChatSwitchProps {
  isChat: boolean;
  changeMode: (isChatMode: boolean) => void;
}

export default function ChatSwitch({ isChat, changeMode }: ChatSwitchProps) {
  const [isChatMode, setIsChatMode] = useState(isChat);

  return (
    <div className="flex items-center text-xs">
      <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        Chat
      </span>
      <Switch
        checked={isChatMode}
        onChange={(value) => {
          setIsChatMode(value);
          changeMode(value);
        }}
        className={`${
          isChatMode
            ? "bg-blue-600 dark:bg-blue-500"
            : "bg-gray-200 dark:bg-gray-700"
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
      >
        <span
          className={`${
            isChatMode ? "translate-x-6" : "translate-x-1"
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </Switch>
    </div>
  );
}
