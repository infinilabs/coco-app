import { useState } from "react";
import clsx from "clsx";
import {
  Check,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RotateCcw,
} from "lucide-react";

import { copyToClipboard, isDefaultServer } from "@/utils";
import { useChatStore } from "@/stores/chatStore";

interface MessageActionsProps {
  id: string;
  content: string;
  question?: string;
  actionClassName?: string;
  actionIconSize?: number;
  copyButtonId?: string;
  onResend?: () => void;
}

const RefreshOnlyIds = ["timedout", "error"];

export const MessageActions = ({
  id,
  content,
  question,
  actionClassName,
  actionIconSize,
  copyButtonId,
  onResend,
}: MessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isRefreshOnly = RefreshOnlyIds.includes(id);

  const { synthesizeItem, setSynthesizeItem } = useChatStore();

  const handleCopy = async () => {
    try {
      await copyToClipboard(content);
      setCopied(true);
      const timerID = setTimeout(() => {
        setCopied(false);
        clearTimeout(timerID);
      }, 2000);
    } catch (err) {
      console.error("copy error:", err);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setDisliked(false);
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    setLiked(false);
  };

  const handleSpeak = async () => {
    if (await isDefaultServer()) {
      return setSynthesizeItem({ id, content });
    }

    if ("speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = "zh-CN";

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleResend = () => {
    if (onResend) {
      setIsResending(true);
      onResend();
      const timerID = setTimeout(() => {
        setIsResending(false);
        clearTimeout(timerID);
      }, 1000);
    }
  };

  return (
    <div className={clsx("flex items-center gap-1 mt-2", actionClassName)}>
      {!isRefreshOnly && (
        <button
          id={copyButtonId}
          onClick={handleCopy}
          className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        >
          {copied ? (
            <Check
              className="w-4 h-4 text-[#38C200] dark:text-[#38C200]"
              style={{
                width: actionIconSize,
                height: actionIconSize,
              }}
            />
          ) : (
            <Copy
              className="w-4 h-4 text-[#666666] dark:text-[#A3A3A3]"
              style={{
                width: actionIconSize,
                height: actionIconSize,
              }}
            />
          )}
        </button>
      )}
      {!isRefreshOnly && (
        <button
          onClick={handleLike}
          className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ${
            liked ? "animate-shake" : ""
          }`}
        >
          <ThumbsUp
            className={`w-4 h-4 ${
              liked
                ? "text-[#1990FF] dark:text-[#1990FF]"
                : "text-[#666666] dark:text-[#A3A3A3]"
            }`}
            style={{
              width: actionIconSize,
              height: actionIconSize,
            }}
          />
        </button>
      )}
      {!isRefreshOnly && (
        <button
          onClick={handleDislike}
          className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ${
            disliked ? "animate-shake" : ""
          }`}
        >
          <ThumbsDown
            className={`w-4 h-4 ${
              disliked
                ? "text-[#1990FF] dark:text-[#1990FF]"
                : "text-[#666666] dark:text-[#A3A3A3]"
            }`}
            style={{
              width: actionIconSize,
              height: actionIconSize,
            }}
          />
        </button>
      )}
      {!isRefreshOnly && (
        <>
          <button
            onClick={handleSpeak}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Volume2
              className={`w-4 h-4 ${
                isSpeaking || synthesizeItem?.id === id
                  ? "text-[#1990FF] dark:text-[#1990FF]"
                  : "text-[#666666] dark:text-[#A3A3A3]"
              }`}
              style={{
                width: actionIconSize,
                height: actionIconSize,
              }}
            />
          </button>
        </>
      )}
      {question && (
        <button
          onClick={handleResend}
          className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ${
            isResending ? "animate-spin" : ""
          }`}
        >
          <RotateCcw
            className={`w-4 h-4 ${
              isResending
                ? "text-[#1990FF] dark:text-[#1990FF]"
                : "text-[#666666] dark:text-[#A3A3A3]"
            }`}
            style={{
              width: actionIconSize,
              height: actionIconSize,
            }}
          />
        </button>
      )}
    </div>
  );
};
