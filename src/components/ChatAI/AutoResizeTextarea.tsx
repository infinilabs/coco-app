import React, { useEffect, useRef } from "react";

interface AutoResizeTextareaProps {
  input: string;
  setInput: (value: string) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  input,
  setInput,
  handleKeyDown,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // Reset height to recalculate
      textarea.style.height = `${textarea.scrollHeight}px`; // Adjust based on content
    }
  }, [input]);

  return (
    <textarea
      ref={textareaRef}
      className="text-xs flex-1 outline-none min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent"
      placeholder="Ask whatever you want....."
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      rows={1}
      style={{
        resize: "none", // Prevent manual resize
        overflow: "auto", // Enable scrollbars when needed
        maxHeight: "4.5rem", // Limit height to 3 rows (3 * 1.5 line-height)
        lineHeight: "1.5rem", // Line height to match row height
      }}
    />
  );
};

export default AutoResizeTextarea;
