import { Library, Mic, Send, Plus, AudioLines, Image } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

import ChatSwitch from "../SearchChat/ChatSwitch";
import AutoResizeTextarea from "./AutoResizeTextarea";
import { useChatStore } from "../../stores/chatStore";
import StopIcon from "../../icons/Stop";

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
  const inputRef = useRef<HTMLInputElement>(null);

  const { curChatEnd } = useChatStore();

  const handleSubmit = () => {
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const openChatAI = async () => {
    console.log("Chat AI opened.");
  };

  return (
    <div className="w-full rounded-xl overflow-hidden">
      <div className="rounded-xl">
        <div className="p-[13px] flex items-center dark:text-[#D8D8D8] bg-white dark:bg-[#202126] rounded-xl transition-all">
          <div className="flex flex-wrap gap-2 flex-1 items-center">
            {isChatMode ? (
              <AutoResizeTextarea
                input={inputValue}
                setInput={changeInput}
                handleKeyDown={handleKeyDown}
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
                inputValue ? "bg-[#0072FF]" : "bg-[#E4E5F0] dark:bg-[#545454]"
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
        </div>

        <div
          data-tauri-drag-region
          className="flex justify-between items-center p-2 rounded-xl"
        >
          {isChatMode ? (
            <div className="flex gap-1 text-xs text-[#333] dark:text-[#d8d8d8]">
              <button
                className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors "
                onClick={openChatAI}
              >
                <Library className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
                Coco
              </button>
              <button className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color">
                <Plus className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
                Upload
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <button
                className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors "
                onClick={openChatAI}
              >
                <AudioLines className="w-4 h-4 text-[#000] dark:text-[#d8d8d8]" />
              </button>
              <button className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color">
                <Image className="w-4 h-4 text-[#000] dark:text-[#d8d8d8]" />
              </button>
            </div>
          )}

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
  );
}
