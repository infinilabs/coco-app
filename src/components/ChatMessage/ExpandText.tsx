import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface ExpandTextProps {
  content: string;
  rows?: number;
  className?: string;
  isJson?: boolean;
}

export const ExpandText = ({
  content,
  rows = 3,
  className = "!mb-0 leading-[20px] text-xs text-[#333] dark:text-[#E5E7EB]",
  isJson = false,
}: ExpandTextProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  
  const textRef = useRef<HTMLElement>(null); 
  const { t } = useTranslation();

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setShowButton(el.scrollHeight > el.clientHeight);
  }, [content, rows]);

  const Component = isJson ? "pre" : "div";

  const mergedClassName = `${className} whitespace-pre-wrap break-words ${
    isJson ? "font-mono" : ""
  } ${expanded ? "" : `line-clamp-${rows}`}`;

  return (
    <div>
      <Component
        /* @ts-ignore */
        ref={textRef}
        className={mergedClassName}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: rows,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {content}
      </Component>
      {showButton && (
        <div className="flex items-center gap-2 mt-0.5">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            type="button"
            className="border-0 bg-transparent p-0 text-[#1890ff] hover:text-[#40a9ff] no-underline outline-none cursor-pointer transition-colors duration-300 select-none text-xs"
          >
            {expanded ? t("labels.collapse") : t("labels.expand")}
          </button>
        </div>
      )}
    </div>
  );
};