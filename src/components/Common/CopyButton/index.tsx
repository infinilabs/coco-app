import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  textToCopy: string;
}

export const CopyButton = ({ textToCopy }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      const timerID = setTimeout(() => {
        setCopied(false);
        clearTimeout(timerID);
      }, 2000);
    } catch (err) {
      console.error("copy error:", err);
    }
  };

  return (
    <button
      className={`p-1 bg-gray-200 dark:bg-gray-700 rounded`}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="w-4 h-4 text-[#38C200] dark:text-[#38C200]" />
      ) : (
        <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      )}
    </button>
  );
};
