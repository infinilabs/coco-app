import { useTranslation } from "react-i18next";

import { ChatMessage } from "@/components/ChatMessage";
import { useConnectStore } from "@/stores/connectStore";

export const Greetings = () => {
  const { t } = useTranslation();
  const currentAssistant = useConnectStore((state) => state.currentAssistant);

  return (
    <ChatMessage
      key={"greetings"}
      message={{
        _id: "greetings",
        _source: {
          type: "assistant",
          message:
            currentAssistant?._source?.chat_settings?.greeting_message ||
            t("assistant.chat.greetings"),
        },
      }}
    />
  );
};
