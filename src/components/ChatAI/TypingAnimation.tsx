import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "./index.css";
interface TypingAnimationProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
}

export function TypingAnimation({
  text,
  onComplete,
  speed = 30,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  // console.log("text", text);

  // return <ReactMarkdown>{text}</ReactMarkdown>;

  return (
    <ReactMarkdown
      className="prose" // 使用 Tailwind 的 `prose` 类来美化 Markdown
      children={text}
      remarkPlugins={[remarkGfm]}
    />
  );
}
