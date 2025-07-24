import { useBoolean } from "ahooks";
import {
  useImperativeHandle,
  forwardRef,
  KeyboardEvent,
  useCallback,
  ChangeEvent,
  useRef,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";

const MAX_HEIGHT = 240;

interface AutoResizeTextareaProps {
  isChatMode: boolean;
  input: string;
  setInput: (value: string) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  chatPlaceholder?: string;
  lineCount?: number;
  onLineCountChange?: (lineCount: number) => void;
  firstLineMaxWidth: number;
}

// Forward ref to allow parent to interact with this component
const AutoResizeTextarea = forwardRef<
  { reset: () => void; focus: () => void },
  AutoResizeTextareaProps
>(
  (
    {
      isChatMode,
      input,
      setInput,
      handleKeyDown,
      chatPlaceholder,
      onLineCountChange,
      firstLineMaxWidth,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [isComposition, { setTrue, setFalse }] = useBoolean();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const calcRef = useRef<HTMLDivElement>(null);

    // Expose methods to the parent via ref
    useImperativeHandle(ref, () => ({
      reset: () => {
        setInput("");
      },
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposition) {
        return event.stopPropagation();
      }

      handleKeyDown?.(event);
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (!textarea || !calcRef.current) return;

      if (!calcRef.current) return;

      textarea.style.height = "auto";

      const computedStyle = getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight);
      let height = lineHeight;
      let minHeight = lineHeight;

      if (calcRef.current?.offsetWidth >= firstLineMaxWidth - 32) {
        minHeight = lineHeight * 2;
        height = Math.min(
          Math.max(minHeight, textarea.scrollHeight),
          MAX_HEIGHT
        );
      }

      textarea.style.height = `${height}px`;
      textarea.style.minHeight = `${minHeight}px`;

      onLineCountChange?.(height / lineHeight);
    }, [input, firstLineMaxWidth]);

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.currentTarget.value);
      },
      [setInput]
    );

    return (
      <>
        <textarea
          ref={textareaRef}
          id={isChatMode ? "chat-textarea" : "search-textarea"}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
          className="text-base flex-1 outline-none w-full min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent custom-scrollbar resize-none overflow-y-auto"
          placeholder={chatPlaceholder || t("search.textarea.placeholder")}
          aria-label={t("search.textarea.ariaLabel")}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          onCompositionStart={setTrue}
          onCompositionEnd={() => {
            setTimeout(setFalse, 0);
          }}
          rows={1}
        />

        <div ref={calcRef} className="absolute whitespace-nowrap -z-10">
          {input}
        </div>
      </>
    );
  }
);

export default AutoResizeTextarea;
