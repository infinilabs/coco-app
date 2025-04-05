import { useRef, useImperativeHandle, forwardRef } from "react";
import { useTranslation } from "react-i18next";

interface AutoResizeTextareaProps {
  input: string;
  setInput: (value: string) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  connected: boolean;
  chatPlaceholder?: string;
}

// Forward ref to allow parent to interact with this component
const AutoResizeTextarea = forwardRef<
  { reset: () => void; focus: () => void },
  AutoResizeTextareaProps
>(({ input, setInput, handleKeyDown, connected, chatPlaceholder }, ref) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose methods to the parent via ref
  useImperativeHandle(ref, () => ({
    reset: () => {
      setInput("");
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  return (
    <textarea
      ref={textareaRef}
      autoFocus
      autoComplete="off"
      autoCapitalize="none"
      spellCheck="false"
      className="text-base flex-1 outline-none min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent"
      placeholder={
        connected ? chatPlaceholder || t("search.textarea.placeholder") : ""
      }
      aria-label={t("search.textarea.ariaLabel")}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => handleKeyDown?.(e)}
      rows={1}
      style={{
        resize: "none", // Prevent manual resize
        overflow: "auto", // Enable scrollbars when needed
        maxHeight: "4.5rem", // Limit height to 3 rows (3 * 1.5 line-height)
        lineHeight: "1.5rem", // Line height to match row height
      }}
    />
  );
});

export default AutoResizeTextarea;
