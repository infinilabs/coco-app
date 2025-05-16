import { ChevronUp, Copy, SquareArrowOutUpRight, Volume2 } from "lucide-react";
import { useState } from "react";
import AiSummaryIcon from "../Common/Icons/AiSummaryIcon";
import clsx from "clsx";
import Markdown from "../ChatMessage/Markdown";

const AiSummary = () => {
  const [expand, setExpand] = useState(true);

  return (
    <div className="flex flex-col gap-2 relative max-h-[210px] px-4 py-3 rounded-[4px] text-[#333] dark:text-[#D8D8D8] bg-white dark:bg-[#141414] shadow-[0_4px_8px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
      <div
        className="absolute top-2 right-2 flex items-center justify-center size-[20px] border rounded-md cursor-pointer dark:border-[#282828]"
        onClick={() => {
          setExpand(!expand);
        }}
      >
        <ChevronUp className="size-4" />
      </div>

      <div className="flex item-center gap-1">
        <AiSummaryIcon color="#881c94" />
        <span className="text-xs font-semibold">AI Summarize</span>
      </div>

      <div
        className={clsx("flex-1 overflow-auto text-sm", {
          hidden: !expand,
        })}
      >
        <Markdown content={"AI Summarize"} />
      </div>

      <div
        className={clsx("flex gap-3", {
          hidden: !expand,
        })}
      >
        <Copy className="size-3 cursor-pointer" />

        <Volume2 className="size-3 cursor-pointer" />

        <SquareArrowOutUpRight className="size-3 cursor-pointer" />
      </div>
    </div>
  );
};

export default AiSummary;
