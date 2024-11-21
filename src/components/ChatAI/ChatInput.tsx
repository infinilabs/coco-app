import { Library, Mic, Send, Plus } from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useEffect,
} from "react";
import ChatSwitch from "../SearchChat/ChatSwitch";
import AutoResizeTextarea from "./AutoResizeTextarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  disabledChange: (disabled: boolean) => void;
  changeMode: (isChatMode: boolean) => void;
}

export function ChatInput({
  onSend,
  disabled,
  disabledChange,
  changeMode,
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

  async function openChatAI() {}

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-xl overflow-hidden">
      <div className="bg-inputbox_bg_light dark:bg-inputbox_bg_dark bg-center rounded-xl">
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
            <button
              className={`ml-1 p-1 ${
                input ? "bg-[#0072FF]" : "bg-[#E4E5F0]"
              } rounded-full transition-colors`}
              onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            >
              <Send className="w-4 h-4 text-white hover:text-[#999]" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center p-2 rounded-xl overflow-hidden">
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

          {/* Switch */}
          <ChatSwitch
            isChat={true}
            onChange={(value) => {
              changeMode(value);
              setInput("");
            }}
          />
        </div>
      </div>
    </form>
  );
}
