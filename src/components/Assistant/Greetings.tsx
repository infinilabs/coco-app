import { useTranslation } from "react-i18next";

import { ChatMessage } from "@/components/ChatMessage";

export const Greetings = () => {
  const { t } = useTranslation();

  return (
    <ChatMessage
      key={"greetings"}
      message={{
        _id: "greetings",
        _source: {
          type: "assistant",
          message: t("assistant.chat.greetings"),
        },
      }}
    />
  );
};
