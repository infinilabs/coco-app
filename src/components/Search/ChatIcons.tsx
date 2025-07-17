import React from "react";
import { Send } from "lucide-react";

import StopIcon from "@/icons/Stop";
import { useChatStore } from "@/stores/chatStore";
import clsx from "clsx";
import { SendMessageParams } from "../Assistant/Chat";

interface ChatIconsProps {
  lineCount: number;
  isChatMode: boolean;
  curChatEnd: boolean;
  inputValue: string;
  onSend: (params: SendMessageParams) => void;
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
  const { uploadFiles } = useChatStore();

  const renderSendButton = () => {
    if (!isChatMode) return null;

    if (curChatEnd) {
      return (
        <button
          className={clsx(
            "ml-1 p-1 rounded-full transition-colors h-6 bg-[#E4E5F0] dark:bg-[rgb(84,84,84)]",
            {
              "!bg-[#0072FF]": inputValue || uploadFiles.length > 0,
            }
          )}
          type="submit"
          onClick={() => {
            onSend({
              message: inputValue.trim(),
              attachments: uploadFiles.map((item) => item.id),
            });
          }}
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
