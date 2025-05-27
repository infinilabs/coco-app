import { useBoolean } from "ahooks";
import {
  useRef,
  useImperativeHandle,
  forwardRef,
  KeyboardEvent,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";

interface AutoResizeTextareaProps {
  input: string;
  setInput: (value: string) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  chatPlaceholder?: string;
  lineCount?: number;
  onLineCountChange?: (lineCount: number) => void;
}

// Forward ref to allow parent to interact with this component
const AutoResizeTextarea = forwardRef<
  { reset: () => void; focus: () => void },
  AutoResizeTextareaProps
>(
  (
    {
      input,
      setInput,
      handleKeyDown,
      chatPlaceholder,
      lineCount = 1,
      onLineCountChange,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isComposition, { setTrue, setFalse }] = useBoolean();

    // Expose methods to the parent via ref
    useImperativeHandle(ref, () => ({
      reset: () => {
        setInput("");
      },
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    useEffect(() => {
      if (textareaRef.current) {
        const length = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(length, length);
      }
    }, [lineCount]);

    const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposition) {
        return event.stopPropagation();
      }

      handleKeyDown?.(event);
    };

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        const newHeight = Math.min(textareaRef.current.scrollHeight, 15 * 16); // 15rem ≈ 15 * 16px
        textareaRef.current.style.height = `${newHeight}px`;

        const lineHeight = 24; // 1.5rem = 24px
        const lineCount = Math.ceil(newHeight / lineHeight);
        onLineCountChange?.(lineCount);
      }
    }, [input]);

    return (
      <textarea
        ref={textareaRef}
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck="false"
        className="text-base flex-1 outline-none w-full min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent custom-scrollbar"
        placeholder={
          chatPlaceholder || t("search.textarea.placeholder")
        }
        aria-label={t("search.textarea.ariaLabel")}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        onCompositionStart={setTrue}
        onCompositionEnd={() => {
          setTimeout(setFalse, 0);
        }}
        rows={1}
        style={{
          resize: "none", // Prevent manual resize
          overflow: "auto", // Enable scrollbars when needed
          maxHeight: "13.5rem", // Limit height to 9 rows (9 * 1.5 line-height)
          lineHeight: "1.5rem", // Line height to match row height
        }}
      />
    );
  }
);

export default AutoResizeTextarea;
