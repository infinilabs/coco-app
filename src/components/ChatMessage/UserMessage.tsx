import { useState } from "react";
import clsx from "clsx";

import { CopyButton } from "@/components/Common/CopyButton";

interface UserMessageProps {
  messageContent: string;
}

export const UserMessage = ({ messageContent }: UserMessageProps) => {
  const [showCopyButton, setShowCopyButton] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const selection = window.getSelection();
      const range = document.createRange();

      if (e.currentTarget && selection && range) {
        try {
          range.selectNodeContents(e.currentTarget);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (error) {
          console.error('Selection failed:', error);
        }
      }
    }
  };

  return (
    <div
      className="max-w-full flex gap-1 items-center justify-end"
      onMouseEnter={() => setShowCopyButton(true)}
      onMouseLeave={() => setShowCopyButton(false)}
    >
      <div
        className={clsx("size-6 transition", {
          "opacity-0": !showCopyButton,
        })}
      >
        <CopyButton textToCopy={messageContent} />
      </div>
      <div
        className="max-w-[85%] overflow-auto text-left px-3 py-2 bg-white dark:bg-[#202126] rounded-xl border border-black/12 dark:border-black/15 font-normal text-sm text-[#333333] dark:text-[#D8D8D8] cursor-pointer user-select-text whitespace-pre-wrap"
        onDoubleClick={handleDoubleClick}
      >
        {messageContent}
      </div>
    </div>
  );
};
