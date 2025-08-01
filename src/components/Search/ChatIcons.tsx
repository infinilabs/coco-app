import React from "react";
import { Send } from "lucide-react";

import StopIcon from "@/icons/Stop";
import clsx from "clsx";
import { SendMessageParams } from "../Assistant/Chat";
import { getUploadedAttachmentsId, isAttachmentsUploaded } from "@/utils";
import VisibleKey from "../Common/VisibleKey";

interface ChatIconsProps {
  lineCount: number;
  isChatMode: boolean;
  curChatEnd: boolean;
  inputValue: string;
  onSend: (params: SendMessageParams) => void;
  disabledChange: () => void;
}

const ChatIcons: React.FC<ChatIconsProps> = ({
  isChatMode,
  curChatEnd,
  inputValue,
  onSend,
  disabledChange,
}) => {
  const renderSendButton = () => {
    if (!isChatMode) return;

    if (curChatEnd) {
      return (
        <button
          className={clsx(
            "flex items-center justify-center rounded-full transition-colors min-w-6 h-6 bg-[#E4E5F0] dark:bg-[rgb(84,84,84)]",
            {
              "!bg-[#0072FF]": inputValue || isAttachmentsUploaded(),
            }
          )}
          type="submit"
          onClick={() => {
            onSend({
              message: inputValue.trim(),
              attachments: getUploadedAttachmentsId(),
            });
          }}
        >
          <VisibleKey shortcut="enter">
            <Send className="size-[14px] text-white" />
          </VisibleKey>
        </button>
      );
    }

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
  };

  return renderSendButton();
};

export default ChatIcons;
