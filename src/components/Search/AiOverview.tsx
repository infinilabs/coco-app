import { Sparkles, X } from "lucide-react";
import { FC, useState } from "react";
import clsx from "clsx";

import { useStreamChat } from "@/hooks/useStreamChat";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { ChatMessage } from "../ChatMessage";
import { Button } from "../ui/button";

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

  const [visible, setVisible] = useState(false);

  const { isTyping, chunkData, loadingStep, messageId } = useStreamChat({
    message,
    clientId: "ai-overview-client-id",
    server: aiOverviewServer,
    assistant: aiOverviewAssistant,
    setVisible,
  });

  return (
    <div className={clsx({ "p-2": visible })}>
      <div
        className={clsx(
          "flex flex-col gap-2 relative max-h-[210px] px-4 py-3 rounded text-[#333] dark:text-[#D8D8D8] bg-white dark:bg-[#141414] shadow-[0_4px_8px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.2)]",
          {
            hidden: !visible,
          }
        )}
      >
        <Button
          size="icon"
          variant="outline"
          className="absolute top-2 right-2 size-5"
          onClick={() => {
            setVisible(false);
          }}
        >
          <X className="size-3" />
        </Button>

        <div className="flex item-center gap-1">
          <Sparkles className="size-4 text-[#881c94]" />
          <span className="text-xs font-semibold">AI Overview</span>
        </div>

        <div className="flex-1 overflow-auto text-sm hide-scrollbar">
          <div className="-ml-11 -mr-4 user-select-text">
            <ChatMessage
              key={messageId}
              hide_assistant
              message={{
                _id: messageId,
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
              actionClassName="absolute bottom-3 left-3 !m-0"
              actionIconSize={12}
            />
          </div>
        </div>

        <div
          className={clsx("min-h-5", {
            hidden: isTyping,
          })}
        />
      </div>
    </div>
  );
};

export default AiOverview;
