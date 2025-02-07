import {
  Library,
  Mic,
  Send,
  Plus,
  AudioLines,
  Image,
  ArrowBigLeft,
  Search,
} from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";

import ChatSwitch from "@/components/Common/ChatSwitch";
import AutoResizeTextarea from "./AutoResizeTextarea";
import { useChatStore } from "@/stores/chatStore";
import StopIcon from "@/icons/Stop";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { metaOrCtrlKey } from "@/utils/keyboardUtils";
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  disabledChange: () => void;
  changeMode: (isChatMode: boolean) => void;
  isChatMode: boolean;
  inputValue: string;
  changeInput: (val: string) => void;
  reconnect: () => void;
}

export default function ChatInput({
  onSend,
  disabled,
  changeMode,
  isChatMode,
  inputValue,
  changeInput,
  disabledChange,
  reconnect,
}: ChatInputProps) {
  const showTooltip = useAppStore((state: { showTooltip: boolean }) => state.showTooltip);

  const sourceData = useSearchStore((state: { sourceData: any; }) => state.sourceData);
  const setSourceData = useSearchStore((state: { setSourceData: any; }) => state.setSourceData);

  useEffect(() => {
    setSourceData(undefined);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<{ reset: () => void; focus: () => void }>(null);

  const { curChatEnd, connected } = useChatStore();

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

  const pressedKeys = new Set<string>();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      console.log("handleKeyDown", e.code, e.key);
      pressedKeys.add(e.key);

      if (e.key === metaOrCtrlKey())  {
        setIsCommandPressed(true);
      }

      if (pressedKeys.has(metaOrCtrlKey())) {
        // e.preventDefault();
        switch (e.code) {
          case "Comma":
            setIsCommandPressed(false);
            break;
          case "KeyI":
            handleToggleFocus();
            break;
          case "ArrowLeft":
            setSourceData(undefined);
            break;
          case "KeyM":
            console.log("KeyM");
            break;
          case "Enter":
            isChatMode && (curChatEnd ? handleSubmit() : disabledChange?.());
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
    [
      handleToggleFocus,
      isChatMode,
      handleSubmit,
      setSourceData,
      setIsCommandPressed,
      disabledChange,
      curChatEnd,
    ]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    pressedKeys.delete(e.key);
    if (e.key === metaOrCtrlKey()) {
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
    if (!isTauri()) return;
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

  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    if (connected) return;
    if (countdown <= 0) {
      ReconnectClick();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, connected]);

  const ReconnectClick = () => {
    setCountdown(5);
    reconnect();
  };

  return (
    <div className="w-full relative">
      <div className="p-2 flex items-center dark:text-[#D8D8D8] bg-[#ededed] dark:bg-[#202126] rounded transition-all relative">
        <div className="flex flex-wrap gap-2 flex-1 items-center relative">
          {!isChatMode && !sourceData ? (
              <Search
                  className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8]"
              />
          ) : (
              !isChatMode && sourceData ? (
                  <ArrowBigLeft
                      className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8] cursor-pointer"
                      onClick={() => setSourceData(undefined)}
                  />
              ) : null
          )}

          {isChatMode ? (
            <AutoResizeTextarea
              ref={textareaRef}
              input={inputValue}
              setInput={changeInput}
              connected={connected}
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
              className="text-base font-normal flex-1 outline-none min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent"
              placeholder="Search whatever you want ..."
              value={inputValue}
              onChange={(e) => {
                onSend(e.target.value);
              }}
            />
          )}
          {showTooltip && isCommandPressed && !isChatMode && sourceData ? (
            <div
              className={`absolute left-0 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#ededed] dark:shadow-[-6px_0px_6px_2px_#202126]`}
            >
              ←
            </div>
          ) : null}
          {showTooltip && isCommandPressed ? (
            <div
              className={`absolute ${!isChatMode && sourceData ? "left-7" : ""
                } w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#ededed] dark:shadow-[-6px_0px_6px_2px_#202126]`}
            >
              I
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
            className={`ml-1 p-1 ${inputValue
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
            className={`absolute right-10 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
          >
            M
          </div>
        ) : null}

        {showTooltip && isChatMode && isCommandPressed ? (
          <div
            className={`absolute right-3 w-4 h-4 flex items-end justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
          >
            ↩︎
          </div>
        ) : null}

        {!connected && isChatMode ? (
          <div className="absolute top-0 right-0 bottom-0 left-0 px-2 py-4 bg-red-500/10 rounded-md font-normal text-xs text-gray-400 flex items-center gap-4">
            Unable to connect to the server
            <div
              className="w-[96px] h-[24px] bg-[#0061FF] rounded-[12px] font-normal text-xs text-white flex items-center justify-center cursor-pointer"
              onClick={ReconnectClick}
            >
              Reconnect ({countdown})
            </div>
          </div>
        ) : null}
      </div>

      <div
        data-tauri-drag-region
        className="flex justify-between items-center p-2"
      >
        {isChatMode ? (
          <div className="flex gap-2 text-xs text-[#333] dark:text-[#d8d8d8]">
            <button
              className="inline-flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
              onClick={openChatAI}
            >
              <Library className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
              Coco
            </button>
            <button className="inline-flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color relative">
              <Plus className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
              Upload
            </button>
            {showTooltip && isCommandPressed ? (
              <div
                className={`absolute left-2 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
              >
                O
              </div>
            ) : null}
            {showTooltip && isCommandPressed ? (
              <div
                className={`absolute left-16 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
              >
                U
              </div>
            ) : null}
          </div>
        ) : (
          <div className="w-28 flex gap-2 relative">
            <button
              className="inline-flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
              onClick={openChatAI}
            >
              <AudioLines className="w-4 h-4 text-[#000] dark:text-[#d8d8d8]" />
            </button>
            <button className="inline-flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color relative">
              <Image className="w-4 h-4 text-[#000] dark:text-[#d8d8d8]" />
            </button>
            {showTooltip && isCommandPressed ? (
              <div
                className={`absolute left-0 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
              >
                N
              </div>
            ) : null}
            {showTooltip && isCommandPressed ? (
              <div
                className={`absolute left-6 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
              >
                G
              </div>
            ) : null}
          </div>
        )}

        <div className="relative w-16 flex justify-end items-center">
          {showTooltip && isCommandPressed ? (
            <div
              className={`absolute left-1 z-10 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
            >
              T
            </div>
          ) : null}
          <ChatSwitch
            isChatMode={isChatMode}
            onChange={(value: boolean) => {
              value && disabledChange();
              changeMode(value);
              setSourceData(undefined);
            }}
          />
        </div>
      </div>
    </div>
  );
}
