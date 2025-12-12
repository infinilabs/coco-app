import React, { useEffect, useCallback } from "react";
import { Bot, Search } from "lucide-react";

import platformAdapter from "@/utils/platformAdapter";
import clsx from "clsx";

interface ChatSwitchProps {
  isChatMode: boolean;
  onChange: (isChatMode: boolean) => void;
}

const ChatSwitch: React.FC<ChatSwitchProps> = ({ isChatMode, onChange }) => {
  const handleToggle = useCallback(() => {
    onChange?.(!isChatMode);
  }, [onChange, isChatMode]);

  useEffect(() => {
    const unlisten = platformAdapter.listenEvent("toggle-to-chat-mode", () => {
      onChange(true);
    });

    return () => {
      unlisten.then((unlisten) => {
        unlisten();
      });
    };
  }, []);

  return (
    <div
      role="switch"
      aria-checked={isChatMode}
      className={`relative flex items-center justify-between w-10 h-5 rounded-full cursor-pointer transition-colors duration-300 ${
        isChatMode ? "bg-[#0072ff]" : "bg-(--coco-primary-color)"
      }`}
      onClick={handleToggle}
    >
      <div
        className={clsx(
          "absolute inset-0 pointer-events-none flex items-center px-1 text-white",
          {
            "justify-end": !isChatMode,
          }
        )}
      >
        {isChatMode ? (
          <Bot className="size-4" />
        ) : (
          <Search className="size-4" />
        )}
      </div>

      <div
        className={clsx(
          "absolute top-px h-4.5 w-4.5 bg-white rounded-full shadow-md",
          [isChatMode ? "right-px" : "left-px"]
        )}
      ></div>
    </div>
  );
};

export default ChatSwitch;
