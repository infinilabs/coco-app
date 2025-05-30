import { ChevronUp, Sparkles } from "lucide-react";
import { FC, useState } from "react";
import clsx from "clsx";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { ChatMessage } from "../ChatMessage";

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
        className={clsx("flex-1 overflow-auto text-sm hide-scrollbar", {
          hidden: !expand,
        })}
      >
        <div className="-ml-11 -mr-4 user-select-text">
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
            rootClassName="!py-0"
            actionClassName="absolute bottom-3 left-3"
            actionIconSize={12}
          />
        </div>
      </div>

      <div
        className={clsx("min-h-[20px]", {
          hidden: !expand || isTyping,
        })}
      />
    </div>
  );
};

export default AiOverview;
