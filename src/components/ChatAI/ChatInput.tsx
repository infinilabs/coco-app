import { SendHorizontal, OctagonX, Filter, Upload } from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useEffect,
} from "react";
import ChatSwitch from "../SearchChat/ChatSwitch";

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

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message... (Press Enter to send, Shift + Enter for new line)"
          rows={1}
          className="w-full resize-none rounded-lg border-0 bg-gray-50 dark:bg-gray-800/50 py-3 pl-4 pr-12 text-sm leading-6 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-shadow"
          disabled={disabled}
        />
        {disabled ? (
          <button
            type="submit"
            className="absolute right-2 bottom-2.5 rounded-md p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <OctagonX
              className="h-5 w-5"
              onClick={() => disabledChange(false)}
            />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="absolute right-2 bottom-2.5 rounded-md p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex justify-between items-center p-2 rounded-xl overflow-hidden">
        <div className="flex gap-3 text-xs">
          <button className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4 mr-2" />问 Coco
          </button>
          <button className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
            <Upload className="w-4 h-4 mr-2" />
            上传
          </button>
        </div>

        {/* Switch */}
        <ChatSwitch isChat={true} changeMode={changeMode} />
      </div>
    </form>
  );
}
