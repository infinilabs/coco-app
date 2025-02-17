import { Mic, Send, Globe, Brain } from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useEffect,
} from "react";

import AutoResizeTextarea from "./AutoResizeTextarea";
import StopIcon from "@/icons/Stop";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  curChatEnd: boolean;
  disabledChange: () => void;
  isSearchActive: boolean;
  setIsSearchActive: () => void;
  isDeepThinkActive: boolean;
  setIsDeepThinkActive: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  curChatEnd,
  disabledChange,
  isSearchActive,
  setIsSearchActive,
  isDeepThinkActive,
  setIsDeepThinkActive,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const SearchClick = () => {
    setIsSearchActive();
  };

  const DeepThinkClick = () => {
    setIsDeepThinkActive();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-xl overflow-hidden">
      <div className="bg-inputbox_bg_light dark:bg-inputbox_bg_dark bg-cover rounded-xl border border-[#E6E6E6] dark:border-[#272626]">
        {/* Search Bar */}
        <div className="relative">
          <div className="p-[13px] flex items-center bg-white dark:bg-[#202126] rounded-xl transition-all">
            <div className="flex flex-wrap gap-2 flex-1 h-auto items-center">
              <AutoResizeTextarea
                input={input}
                setInput={setInput}
                handleKeyDown={handleKeyDown}
              />
            </div>
            <button className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Mic className="w-4 h-4 text-[#999] dark:text-[#999]" />
            </button>
            {curChatEnd ? (
              <button
                className={`ml-1 p-1 ${
                  input ? "bg-[#0072FF]" : "bg-[#E4E5F0]"
                } rounded-full transition-colors`}
                onClick={(e) => handleSubmit(e as unknown as FormEvent)}
              >
                <Send className="w-4 h-4 text-white hover:text-[#999]" />
              </button>
            ) : null}
            {!curChatEnd ? (
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
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center p-2 rounded-xl overflow-hidden">
          <div className="flex gap-1 px-[5px] text-xs text-[#333] dark:text-[#fff]">
            <button
              type="button"
              className={`h-5 px-2 inline-flex items-center border  rounded-[10px] transition-colors relative ${
                isDeepThinkActive ? "bg-[rgba(0,114,255,0.3)] border-[rgba(0,114,255,0.3)]" : "border-[#262727]"
              }`}
              onClick={DeepThinkClick}
            >
              <Brain
                className={`w-3 h-3 mr-1 ${
                  isDeepThinkActive
                    ? "text-[#0072FF] dark:text-[#0072FF]"
                    : "text-[#333] dark:text-white"
                }`}
              />
              <span className={isDeepThinkActive ? "text-[#0072FF]" : "dark:text-white"}>
                Deep Think
              </span>
            </button>
            <button
              type="button"
              className={`h-5 px-2 inline-flex items-center border  rounded-[10px] transition-colors relative ${
                isSearchActive ? "bg-[rgba(0,114,255,0.3)] border-[rgba(0,114,255,0.3)]" : "border-[#262727]"
              }`}
              onClick={SearchClick}
            >
              <Globe
                className={`w-3 h-3 mr-1 ${
                  isSearchActive
                    ? "text-[#0072FF] dark:text-[#0072FF]"
                    : "text-[#333] dark:text-white"
                }`}
              />
              <span className={isSearchActive ? "text-[#0072FF]" : "dark:text-white"}>
                Search
              </span>
            </button>
            {/* <button
              type="button"
              className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors "
              onClick={openChatAI}
            >
              <Library className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
              Coco
            </button>
            <button 
              type="button"
              className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color">
              <Plus className="w-4 h-4 mr-1 text-[#000] dark:text-[#d8d8d8]" />
              Upload
            </button> */}
          </div>
        </div>
      </div>
    </form>
  );
}
