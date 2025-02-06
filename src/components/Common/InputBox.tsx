import { Library, Mic, Send, Plus, AudioLines, Image } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";

import ChatSwitch from "@/components/Common/ChatSwitch";
import AutoResizeTextarea from "./AutoResizeTextarea";
import { useChatStore } from "../../stores/chatStore";
import StopIcon from "../../icons/Stop";
import { useAppStore } from "../../stores/appStore";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  disabledChange: () => void;
  changeMode: (isChatMode: boolean) => void;
  isChatMode: boolean;
  inputValue: string;
  changeInput: (val: string) => void;
}

export default function ChatInput({
  onSend,
  disabled,
  changeMode,
  isChatMode,
  inputValue,
  changeInput,
  disabledChange,
}: ChatInputProps) {
  const showTooltip = useAppStore((state) => state.showTooltip);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<{ reset: () => void; focus: () => void }>(null);

  const { curChatEnd } = useChatStore();

  const [isCommandPressed, setIsCommandPressed] = useState(false);

  const handleToggleFocus = useCallback(() => {
    if (isChatMode) {
      textareaRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [isChatMode, textareaRef, inputRef]);

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled) {
      onSend(trimmedValue);
    }
  }, [inputValue, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "MetaLeft" || e.code === "MetaRight") {
        setIsCommandPressed(true);
      }

      if (e.metaKey) {
        switch (e.code) {
          case "KeyI":
            handleToggleFocus();
            break;
          case "KeyM":
            console.log("KeyM");
            break;
          case "Enter":
            isChatMode && handleSubmit();
            break;
          case "KeyO":
            console.log("KeyO");
            break;
          case "KeyU":
            console.log("KeyU");
            break;
          case "KeyN":
            console.log("KeyN");
            break;
          case "KeyG":
            console.log("KeyG");
            break;
          default:
            break;
        }
      }
    },
    [handleToggleFocus, isChatMode, handleSubmit]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === "MetaLeft" || e.code === "MetaRight") {
      setIsCommandPressed(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen("tauri://focus", () => {
        // console.log("Window focused!");
        if (isChatMode) {
          textareaRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      });

      return unlisten;
    };

    let unlisten: (() => void) | undefined;

    setupListener().then((unlistener) => {
      unlisten = unlistener;
    });

    return () => {
      unlisten?.();
    };
  }, [isChatMode]);

  const openChatAI = async () => {
    console.log("Chat AI opened.");
  };

  return (
    <div className="w-full rounded-xl overflow-hidden relative">
      <div className="rounded-xl">
        <div className="p-[13px] flex items-center dark:text-[#D8D8D8] bg-white dark:bg-[#202126] rounded-xl transition-all relative">
          <div className="flex flex-wrap gap-2 flex-1 items-center relative">
            {isChatMode ? (
              <AutoResizeTextarea
                ref={textareaRef}
                input={inputValue}
                setInput={changeInput}
                handleKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            ) : (
              <input
                ref={inputRef}
                type="text"
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                className="text-xs leading-6 font-normal flex-1 outline-none min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent"
                placeholder="Search whatever you want ..."
                value={inputValue}
                onChange={(e) => {
                  onSend(e.target.value);
                }}
              />
            )}
            {showTooltip && isCommandPressed ? (
              <div
                className={`absolute bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
              >
                ⌘ + i
              </div>
            ) : null}
          </div>

          {isChatMode ? (
            <button
              className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
              type="button"
            >
              <Mic className="w-4 h-4 text-[#999] dark:text-[#999]" />
            </button>
          ) : null}

          {isChatMode && curChatEnd ? (
            <button
              className={`ml-1 p-1 ${
                inputValue
                  ? "bg-[#0072FF]"
                  : "bg-[#E4E5F0] dark:bg-[rgb(84,84,84)]"
              } rounded-full transition-colors`}
              type="submit"
              onClick={() => onSend(inputValue.trim())}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          ) : null}
          {isChatMode && !curChatEnd ? (
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
          ) : null}

          {showTooltip && isChatMode && isCommandPressed ? (
            <div
              className={`absolute right-16 bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
            >
              ⌘ + m
            </div>
          ) : null}

          {showTooltip && isChatMode && isCommandPressed ? (
            <div
              className={`absolute right-1 bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
            >
              ⌘ + ↩︎
            </div>
          ) : null}
        </div>

        <div
          data-tauri-drag-region
          className="flex justify-between items-center p-2 rounded-xl"
        >
          {isChatMode ? (
            <div className="flex gap-1 text-xs text-[#333] dark:text-[#d8d8d8]">
              <button
                className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                onClick={openChatAI}
              >
                <Library className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
                Coco
                {showTooltip && isCommandPressed ? (
                  <div
                    className={`absolute left-0 bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
                  >
                    ⌘ + o
                  </div>
                ) : null}
              </button>
              <button className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color relative">
                <Plus className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
                Upload
                {showTooltip && isCommandPressed ? (
                  <div
                    className={`absolute left-1 bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
                  >
                    ⌘ + u
                  </div>
                ) : null}
              </button>
            </div>
          ) : (
            <div className="w-28 flex gap-1 relative">
              <button
                className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                onClick={openChatAI}
              >
                <AudioLines className="w-4 h-4 text-[#000] dark:text-[#d8d8d8]" />
              </button>
              <button className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color relative">
                <Image className="w-4 h-4 text-[#000] dark:text-[#d8d8d8]" />
              </button>
              {showTooltip && isCommandPressed ? (
                <div
                  className={`absolute left-0 bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
                >
                  ⌘ + n
                </div>
              ) : null}
              {showTooltip && isCommandPressed ? (
                <div
                  className={`absolute left-14 bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
                >
                  ⌘ + g
                </div>
              ) : null}
            </div>
          )}

          <div className="relative w-24 flex justify-end items-center">
            {showTooltip && isCommandPressed ? (
              <div
                className={`absolute left-0 z-10 bg-black bg-opacity-70 text-white font-bold px-2.5 py-1 rounded-md text-xs transition-opacity duration-200`}
              >
                ⌘ + t
              </div>
            ) : null}
            <ChatSwitch
              isChatMode={isChatMode}
              onChange={(value) => {
                value && disabledChange();
                changeMode(value);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
