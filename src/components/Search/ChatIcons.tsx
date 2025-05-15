import React from "react";
import { Send } from "lucide-react";

import StopIcon from "@/icons/Stop";

interface ChatIconsProps {
  lineCount: number;
  isChatMode: boolean;
  curChatEnd: boolean;
  inputValue: string;
  onSend: (value: string) => void;
  disabledChange: () => void;
}

const ChatIcons: React.FC<ChatIconsProps> = ({
  lineCount,
  isChatMode,
  curChatEnd,
  inputValue,
  onSend,
  disabledChange,
}) => {
  const renderSendButton = () => {
    if (!isChatMode) return null;

    if (curChatEnd) {
      return (
        <button
          className={`ml-1 p-1 ${
            inputValue ? "bg-[#0072FF]" : "bg-[#E4E5F0] dark:bg-[rgb(84,84,84)]"
          } rounded-full transition-colors`}
          type="submit"
          onClick={() => onSend(inputValue.trim())}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      );
    }

    if (!curChatEnd) {
      return (
        <button
          className={`ml-1 px-1 bg-[#0072FF] rounded-full transition-colors`}
          type="submit"
          onClick={() => disabledChange()}
        >
          <StopIcon
            size={16}
            className="w-4 h-4 text-white"
            aria-label="Stop message"
          />
        </button>
      );
    }

    return null;
  };

  return (
    <>
      {lineCount === 1 ? (
        renderSendButton()
      ) : (
        <div className="w-full flex justify-end mt-1">{renderSendButton()}</div>
      )}
    </>
  );
};

export default ChatIcons;
