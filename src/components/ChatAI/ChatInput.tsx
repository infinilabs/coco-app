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
      <div className="b-none bg-[#F2F2F2] dark:bg-gray-800 rounded-xl overflow-hidden">
        {/* Search Bar */}
        <div className="relative">
          <div className="p-2.5 flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
            <div className="flex flex-wrap gap-2 flex-1 h-auto items-center">
              <AutoResizeTextarea
                input={input}
                setInput={setInput}
                handleKeyDown={handleKeyDown}
              />
            </div>
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Mic className="w-3 h-3 text-[#333] dark:text-gray-500" />
            </button>
            <button
              className={`ml-1 p-2 ${
                input ? "bg-[rgba(66,133,244,1)]" : "bg-[#E4E5F0]"
              } rounded-full transition-colors`}
              onClick={(e)=> handleSubmit(e as unknown as FormEvent)}
            >
              <Send className="w-3 h-3 text-white hover:text-[#333]" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center p-2 rounded-xl overflow-hidden bg-#F2F2F2">
          <div className="flex gap-1 text-xs text-[#101010] dark:text-gray-300">
            <button
              className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors "
              onClick={openChatAI}
            >
              <Library className="w-4 h-4 mr-1" />
              Coco
            </button>
            <button className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color">
              <Plus className="w-4 h-4 mr-1" />
              上传
            </button>
          </div>

          {/* Switch */}
          <ChatSwitch
            isChat={true}
            changeMode={(value) => {
              changeMode(value);
              setInput("");
            }}
          />
        </div>
      </div>
    </form>
  );
}
