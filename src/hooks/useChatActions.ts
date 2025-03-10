import { useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

import type { Chat } from "@/components/Assistant/types";

export function useChatActions(
  currentServiceId: string | undefined,
  setActiveChat: (chat: Chat | undefined) => void,
  setCurChatEnd: (value: boolean) => void,
  setErrorShow: (value: boolean) => void,
  setTimedoutShow: (value: boolean) => void,
  clearAllChunkData: () => void,
  setQuestion: (value: string) => void,
  curIdRef: React.MutableRefObject<string>,
  isSearchActive?: boolean,
  isDeepThinkActive?: boolean,
  sourceDataIds?: string[],
  changeInput?: (val: string) => void,
) {
  const chatClose = useCallback(async (activeChat?: Chat) => {
    if (!activeChat?._id) return;
    try {
      let response: any = await invoke("close_session_chat", {
        serverId: currentServiceId,
        sessionId: activeChat?._id,
      });
      response = JSON.parse(response || "");
      console.log("_close", response);
    } catch (error) {
      console.error("chatClose:", error);
    }
  }, [currentServiceId]);

  const cancelChat = useCallback(async (activeChat?: Chat) => {
    setCurChatEnd(true);
    if (!activeChat?._id) return;
    try {
      let response: any = await invoke("cancel_session_chat", {
        serverId: currentServiceId,
        sessionId: activeChat?._id,
      });
      response = JSON.parse(response || "");
      console.log("_cancel", response);
    } catch (error) {
      console.error("cancelChat:", error);
    }
  }, [currentServiceId, setCurChatEnd]);

  const chatHistory = useCallback(async (
    chat: Chat,
    callback?: (chat: Chat) => void
  ) => {
    try {
      let response: any = await invoke("session_chat_history", {
        serverId: currentServiceId,
        sessionId: chat?._id,
        from: 0,
        size: 20,
      });
      response = JSON.parse(response || "");
      const hits = response?.hits?.hits || [];
      const updatedChat: Chat = {
        ...chat,
        messages: hits,
      };
      console.log("id_history", response, updatedChat);
      setActiveChat(updatedChat);
      callback && callback(updatedChat);
    } catch (error) {
      console.error("chatHistory:", error);
    }
  }, [currentServiceId, setActiveChat]);

  const createNewChat = useCallback(
    async (value: string = "", activeChat?: Chat) => {
      setTimedoutShow(false);
      setErrorShow(false);
      chatClose(activeChat);
      clearAllChunkData();
      setQuestion(value);
      try {
        console.log("sourceDataIds", sourceDataIds);
        let response: any = await invoke("new_chat", {
          serverId: currentServiceId,
          message: value,
          queryParams: {
            search: isSearchActive,
            deep_thinking: isDeepThinkActive,
            datasource: sourceDataIds?.join(",") || "",
          },
        });
        console.log("_new", response);
        const newChat: Chat = response;
        curIdRef.current = response?.payload?.id;

        newChat._source = {
          message: value,
        };
        const updatedChat: Chat = {
          ...newChat,
          messages: [newChat],
        };

        changeInput && changeInput("");
        setActiveChat(updatedChat);
        setCurChatEnd(false);
      } catch (error) {
        setErrorShow(true);
        console.error("createNewChat:", error);
      }
    },
    [currentServiceId, sourceDataIds, isSearchActive, isDeepThinkActive, curIdRef]
  );

  const sendMessage = useCallback(
    async (content: string, newChat: Chat) => {
      if (!newChat?._id || !content) return;

      try {
        let response: any = await invoke("send_message", {
          serverId: currentServiceId,
          sessionId: newChat?._id,
          queryParams: {
            search: isSearchActive,
            deep_thinking: isDeepThinkActive,
            datasource: sourceDataIds?.join(",") || "",
          },
          message: content,
        });
        response = JSON.parse(response || "");
        console.log("_send", response);
        curIdRef.current = response[0]?._id;

        const updatedChat: Chat = {
          ...newChat,
          messages: [...(newChat?.messages || []), ...(response || [])],
        };

        changeInput && changeInput("");
        setActiveChat(updatedChat);
        setCurChatEnd(false);
      } catch (error) {
        setErrorShow(true);
        console.error("sendMessage:", error);
      }
    },
    [currentServiceId, sourceDataIds, isSearchActive, isDeepThinkActive, curIdRef, setActiveChat, setCurChatEnd, setErrorShow, changeInput]
  );

  const handleSendMessage = useCallback(
    async (content: string, activeChat?: Chat) => {
      if (!activeChat?._id || !content) return;
      setQuestion(content);

      setTimedoutShow(false);
      setErrorShow(false);
      clearAllChunkData();

      await chatHistory(activeChat, (chat) => sendMessage(content, chat));
    },
    [chatHistory, sendMessage, setQuestion, setTimedoutShow, setErrorShow, clearAllChunkData]
  );

  const openSessionChat = useCallback(async (chat: Chat) => {
    try {
      let response: any = await invoke("open_session_chat", {
        serverId: currentServiceId,
        sessionId: chat?._id,
      });
      response = JSON.parse(response || "");
      console.log("_open", response);
      return response;
    } catch (error) {
      console.error("open_session_chat:", error);
      return null;
    }
  }, [currentServiceId]);

  const getChatHistory = useCallback(async () => {
    if (!currentServiceId) return [];
    try {
      let response: any = await invoke("chat_history", {
        serverId: currentServiceId,
        from: 0,
        size: 20,
      });
      response = JSON.parse(response || "");
      console.log("_history", response);
      const hits = response?.hits?.hits || [];
      return hits;
    } catch (error) {
      console.error("chat_history:", error);
      return [];
    }
  }, [currentServiceId]);

  const createChatWindow = useCallback(async (createWin: any) => {
    if (isTauri()) {
      createWin && createWin({
        label: "chat",
        title: "Coco Chat",
        dragDropEnabled: true,
        center: true,
        width: 1000,
        height: 800,
        alwaysOnTop: false,
        skipTaskbar: false,
        decorations: true,
        closable: true,
        url: "/ui/chat",
      });
    }
  }, []);

  return {
    chatClose,
    cancelChat,
    chatHistory,
    createNewChat,
    sendMessage,
    handleSendMessage,
    openSessionChat,
    getChatHistory,
    createChatWindow
  };
}