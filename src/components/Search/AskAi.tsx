import { ASK_AI_CLIENT_ID } from "@/constants";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import platformAdapter from "@/utils/platformAdapter";
import { useMount } from "ahooks";
import { useEffect } from "react";

const AskAi = () => {
  const askAiMessage = useSearchStore((state) => state.askAiMessage);
  const currentService = useConnectStore((state) => state.currentService);

  useMount(() => {
    platformAdapter.listenEvent(ASK_AI_CLIENT_ID, ({ payload }) => {
      console.log("ask_ai", payload);
    });
  });

  useEffect(() => {
    if (!askAiMessage || !currentService?.id) return;

    platformAdapter.invokeBackend("ask_ai", {
      message: askAiMessage,
      serverId: currentService.id,
      assistantId: "default",
      clientId: ASK_AI_CLIENT_ID,
    });
  }, [askAiMessage]);

  return (
    <div className="p-4 h-full">
      <div className="h-full px-3 py-4 bg-[#F8F8F8]">
        <div className="mb-4 text-xs text-[#999] font-semibold">
          {askAiMessage}
        </div>
        <>聊天组件</>
      </div>
    </div>
  );
};

export default AskAi;
