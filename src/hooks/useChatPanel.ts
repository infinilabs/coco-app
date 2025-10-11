import { useCallback, useState } from "react";

import type { Chat } from "@/types/chat";
import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import { unrequitable } from "@/utils";

export function useChatPanel() {
  const {
    assistantList,
    setCurrentAssistant,
    setVisibleStartPage,
    currentService,
  } = useConnectStore();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | undefined>();
  const [keyword, setKeyword] = useState("");

  const getChatHistory = useCallback(async () => {
    try {
      if (await unrequitable()) {
        return setChats([]);
      }
      let response: any = await platformAdapter.commands("chat_history", {
        serverId: currentService?.id,
        from: 0,
        size: 100,
        query: keyword,
      });
      response = response ? JSON.parse(response) : null;
      const hits = response?.hits?.hits || [];
      setChats(hits);
    } catch (error) {
      console.error("chat_history:", error);
    }
  }, [keyword, currentService?.id]);

  const chatHistory = useCallback(
    async (chat: Chat) => {
      try {
        let response: any = await platformAdapter.commands(
          "session_chat_history",
          {
            serverId: currentService?.id,
            sessionId: chat?._id || "",
            from: 0,
            size: 500,
          }
        );
        response = response ? JSON.parse(response) : null;
        const hits = response?.hits?.hits || [];

        // set current assistant based on last message
        const lastAssistantId = hits[hits.length - 1]?._source?.assistant_id;
        const matchedAssistant = assistantList?.find(
          (assistant) => assistant._id === lastAssistantId
        );
        if (matchedAssistant) {
          setCurrentAssistant(matchedAssistant);
        }

        const updatedChat: Chat = {
          ...chat,
          messages: hits,
        };
        setActiveChat(updatedChat);
      } catch (error) {
        console.error("session_chat_history:", error);
      }
    },
    [assistantList, currentService?.id, setCurrentAssistant]
  );

  const onSelectChat = useCallback(
    async (chat: any) => {
      try {
        let response: any = await platformAdapter.commands(
          "open_session_chat",
          {
            serverId: currentService?.id,
            sessionId: chat?._id,
          }
        );
        response = response ? JSON.parse(response) : null;
        chatHistory(response);
        setVisibleStartPage(false);
      } catch (error) {
        console.error("open_session_chat:", error);
      }
    },
    [currentService?.id, chatHistory, setVisibleStartPage]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!currentService?.id) return;

      await platformAdapter.commands(
        "delete_session_chat",
        currentService.id,
        chatId
      );

      setChats((prev) => prev.filter((chat) => chat._id !== chatId));
      if (activeChat?._id === chatId) {
        const remainingChats = chats.filter((chat) => chat._id !== chatId);
        setActiveChat(remainingChats[0]);
      }
    },
    [currentService?.id, activeChat?._id, chats]
  );

  const handleSearch = useCallback((kw: string) => {
    setKeyword(kw);
  }, []);

  const handleRename = useCallback(
    (chatId: string, title: string) => {
      if (!currentService?.id) return;

      setChats((prev) => {
        const updatedChats = prev.map((item) => {
          if (item._id !== chatId) return item;
          return { ...item, _source: { ...item._source, title } };
        });
        return updatedChats;
      });

      if (activeChat?._id === chatId) {
        setActiveChat((prev) => {
          if (!prev) return prev;
          return { ...prev, _source: { ...prev._source, title } };
        });
      }

      platformAdapter.commands("update_session_chat", {
        serverId: currentService.id,
        sessionId: chatId,
        title,
      });
    },
    [currentService?.id, activeChat?._id]
  );

  return {
    chats,
    setChats,
    activeChat,
    setActiveChat,
    keyword,
    setKeyword,
    getChatHistory,
    chatHistory,
    onSelectChat,
    deleteChat,
    handleSearch,
    handleRename,
  };
}