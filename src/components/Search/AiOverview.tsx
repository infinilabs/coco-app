import { ChevronUp, Copy, Sparkles, Volume2 } from "lucide-react";
import { FC, useState } from "react";
import clsx from "clsx";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { ChatMessage } from "../ChatMessage";
import { COPY_BUTTON_ID } from "@/constants";

interface AiSummaryProps {
  message: string;
}

const AiOverview: FC<AiSummaryProps> = (props) => {
  const { message } = props;
  const aiOverviewServer = useExtensionsStore((state) => {
    return state.aiOverviewServer;
  });
  const aiOverviewAssistant = useExtensionsStore((state) => {
    return state.aiOverviewAssistant;
  });

  const [expand, setExpand] = useState(true);

  const { isTyping, chunkData, loadingStep } = useStreamChat({
    message,
    clientId: "ai-overview-client-id",
    server: aiOverviewServer,
    assistant: aiOverviewAssistant,
  });

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
        <Sparkles className="size-4 text-[#881c94]" />
        <span className="text-xs font-semibold">AI Overview</span>
      </div>

      <div
        className={clsx("flex-1 overflow-auto text-sm", {
          hidden: !expand,
        })}
      >
        <div className="-my-8 -ml-11 user-select-text">
          <ChatMessage
            key="current"
            hide_assistant
            message={{
              _id: "current",
              _source: {
                type: "assistant",
                message: "",
                question: "",
              },
            }}
            {...chunkData}
            isTyping={isTyping}
            loadingStep={loadingStep}
          />
        </div>
      </div>

      <div
        className={clsx("flex gap-3", {
          hidden: !expand || isTyping,
        })}
      >
        <Copy
          className="size-3 cursor-pointer"
          onClick={() => {
            const copyButton = document.getElementById(COPY_BUTTON_ID);

            copyButton?.click();
          }}
        />

        <Volume2 className="size-3 cursor-pointer" />
      </div>
    </div>
  );
};

export default AiOverview;
