import { useBoolean, useDebounceFn } from "ahooks";
import {
  useRef,
  useImperativeHandle,
  forwardRef,
  KeyboardEvent,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";

const LINE_HEIGHT = 24; // 1.5rem
const MAX_FIRST_LINE_WIDTH = 470; // Width in pixels for first line
const MAX_HEIGHT = 240; // 15rem

interface AutoResizeTextareaProps {
  isChatMode: boolean;
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
      isChatMode,
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

    // Memoize resize logic
    const { run: debouncedResize } = useDebounceFn(
      () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (typeof window === "undefined" || typeof document === "undefined")
          return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = "auto";

        // Create a hidden span to measure first line width
        const span = document.createElement("span");
        span.style.visibility = "hidden";
        span.style.position = "absolute";
        span.style.whiteSpace = "pre";
        span.style.font = window.getComputedStyle(textarea).font;

        // Get first line content
        const content = textarea.value;
        const firstLineEnd =
          content.indexOf("\n") === -1 ? content.length : content.indexOf("\n");
        span.textContent = content.slice(0, firstLineEnd);
        document.body.appendChild(span);

        // Calculate lines based on first line width
        const firstLineWidth = span.offsetWidth;
        document.body.removeChild(span);

        // Start with 1 line
        let lines = 1;

        // Add a line if first line exceeds max width
        if (firstLineWidth > MAX_FIRST_LINE_WIDTH) {
          lines += 1;
        }

        // Add lines based on scrollHeight for remaining content
        const scrollHeight = textarea.scrollHeight;
        const remainingLines = Math.floor(
          (scrollHeight - LINE_HEIGHT) / LINE_HEIGHT
        );
        lines += Math.max(0, remainingLines);

        // Calculate final height
        const newHeight = Math.min(lines * LINE_HEIGHT, MAX_HEIGHT);

        // Only update if height actually changed
        if (textarea.style.height !== `${newHeight}px`) {
          textarea.style.height = `${newHeight}px`;
          onLineCountChange?.(lines);
        }
      },
      { wait: 100 }
    );

    // Handle input changes and initial setup
    useEffect(() => {
      if (textareaRef.current) {
        debouncedResize();
      }
    }, [input, debouncedResize]);

    useEffect(() => {
      if (textareaRef.current) {
        requestAnimationFrame(() => {
          // Set cursor position to end
          const length = textareaRef.current?.value.length || 0;
          textareaRef.current?.setSelectionRange(length, length);
        });
      }
    }, [lineCount]);

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

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
      },
      [setInput]
    );

    return (
      <textarea
        ref={textareaRef}
        id={isChatMode ? "chat-textarea" : "search-textarea"}
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck="false"
        className="text-base flex-1 outline-none w-full min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent custom-scrollbar"
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
        style={{
          resize: "none", // Prevent manual resize
          overflow: "auto",
          minHeight: "1.5rem",
          maxHeight: "13.5rem", // Limit height to 9 rows (9 * 1.5 line-height)
          lineHeight: "1.5rem", // Line height to match row height
        }}
      />
    );
  }
);

export default AutoResizeTextarea;
