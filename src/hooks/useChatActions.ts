import { useCallback, useEffect, useState } from "react";

import type { Chat } from "@/components/Assistant/types";
import { useAppStore } from "@/stores/appStore";
import { Get, Post } from "@/api/axiosRequest";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import { useChatStore } from "@/stores/chatStore";
import { useSearchStore } from "@/stores/searchStore";

export function useChatActions(
  currentServiceId: string | undefined,
  setActiveChat: (chat: Chat | undefined) => void,
  setCurChatEnd: (value: boolean) => void,
  setTimedoutShow: (value: boolean) => void,
  clearAllChunkData: () => void,
  setQuestion: (value: string) => void,
  curIdRef: React.MutableRefObject<string>,
  setChats: (chats: Chat[]) => void,
  isSearchActive?: boolean,
  isDeepThinkActive?: boolean,
  isMCPActive?: boolean,
  changeInput?: (val: string) => void,
  websocketSessionId?: string,
  showChatHistory?: boolean
) {
  const isTauri = useAppStore((state) => state.isTauri);
  const addError = useAppStore((state) => state.addError);
  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const { connected } = useChatStore();
  const sourceDataIds = useSearchStore((state) => state.sourceDataIds);
  const MCPIds = useSearchStore((state) => state.MCPIds);

  const [keyword, setKeyword] = useState("");

  const chatClose = useCallback(
    async (activeChat?: Chat) => {
      if (!activeChat?._id) return;
      try {
        let response: any;
        if (isTauri) {
          if (!currentServiceId) return;
          response = await platformAdapter.commands("close_session_chat", {
            serverId: currentServiceId,
            sessionId: activeChat?._id,
          });
          response = response ? JSON.parse(response) : null;
        } else {
          const [error, res] = await Post(
            `/chat/${activeChat?._id}/_close`,
            {}
          );
          if (error) {
            console.error("_close", error);
            return;
          }
          response = res;
        }
        console.log("_close", response);
      } catch (error) {
        console.error("chatClose:", error);
      }
    },
    [currentServiceId]
  );

  const cancelChat = useCallback(
    async (activeChat?: Chat) => {
      setCurChatEnd(true);
      if (!activeChat?._id) return;
      try {
        let response: any;
        if (isTauri) {
          if (!currentServiceId) return;
          response = await platformAdapter.commands("cancel_session_chat", {
            serverId: currentServiceId,
            sessionId: activeChat?._id,
          });
          response = response ? JSON.parse(response) : null;
        } else {
          const [error, res] = await Post(
            `/chat/${activeChat?._id}/_cancel`,
            {}
          );
          if (error) {
            console.error("_cancel", error);
            return;
          }
          response = res;
        }
        console.log("_cancel", response);
      } catch (error) {
        console.error("cancelChat:", error);
      }
    },
    [currentServiceId, setCurChatEnd]
  );

  const chatHistory = useCallback(
    async (chat: Chat, callback?: (chat: Chat) => void) => {
      if (!chat?._id) return;
      try {
        let response: any;
        if (isTauri) {
          if (!currentServiceId) return;
          response = await platformAdapter.commands("session_chat_history", {
            serverId: currentServiceId,
            sessionId: chat?._id,
            from: 0,
            size: 20,
          });
          response = response ? JSON.parse(response) : null;
        } else {
          const [error, res] = await Get(`/chat/${chat?._id}/_history`, {
            from: 0,
            size: 20,
          });
          if (error) {
            console.error("_cancel", error);
            return;
          }
          response = res;
        }
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
    },
    [currentServiceId, setActiveChat]
  );

  const createNewChat = useCallback(
    async (value: string = "", activeChat?: Chat, id?: string) => {
      try {
        setTimedoutShow(false);
        await chatClose(activeChat);
        clearAllChunkData();
        setQuestion(value);
        if (!(websocketSessionId || id)) {
          addError("websocketSessionId not found");
          console.error("websocketSessionId", websocketSessionId, id);
          return;
        }
        console.log("sourceDataIds", sourceDataIds, MCPIds, websocketSessionId, id);
        let response: any;
        if (isTauri) {
          if (!currentServiceId) return;
          response = await platformAdapter.commands("new_chat", {
            serverId: currentServiceId,
            websocketId: websocketSessionId || id,
            message: value,
            queryParams: {
              search: isSearchActive,
              deep_thinking: isDeepThinkActive,
              mcp: isMCPActive,
              datasource: sourceDataIds?.join(",") || "",
              mcp_servers: MCPIds?.join(",") || "",
              assistant_id: currentAssistant?._id || '',
            },
          });
        } else {
          console.log("websocketSessionId", websocketSessionId, id);
          const [error, res] = await Post(
            "/chat/_new",
            {
              message: value,
            },
            {
              search: isSearchActive,
              deep_thinking: isDeepThinkActive,
              mcp: isMCPActive,
              datasource: sourceDataIds?.join(",") || "",
              mcp_servers: MCPIds?.join(",") || "",
              assistant_id: currentAssistant?._id || '',
            },
            {
              "WEBSOCKET-SESSION-ID": websocketSessionId || id,
            }
          );
          if (error) {
            console.error("_new", error);
            return;
          }
          response = res;
        }
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
        console.error("createNewChat:", error);
      }
    },
    [
      currentServiceId,
      sourceDataIds,
      MCPIds,
      isSearchActive,
      isDeepThinkActive,
      isMCPActive,
      curIdRef,
      websocketSessionId,
      currentAssistant,
    ]
  );

  const sendMessage = useCallback(
    async (content: string, newChat: Chat, id?: string) => {
      if (!newChat?._id || !content) return;

      clearAllChunkData();
      try {
        if (!(websocketSessionId || id)) {
          addError("websocketSessionId not found");
          console.error("websocketSessionId", websocketSessionId, id);
          return;
        }
        let response: any;
        if (isTauri) {
          if (!currentServiceId) return;
          response = await platformAdapter.commands("send_message", {
            serverId: currentServiceId,
            websocketId: websocketSessionId || id,
            sessionId: newChat?._id,
            queryParams: {
              search: isSearchActive,
              deep_thinking: isDeepThinkActive,
              mcp: isMCPActive,
              datasource: sourceDataIds?.join(",") || "",
              mcp_servers: MCPIds?.join(",") || "",
              assistant_id: currentAssistant?._id || '',
            },
            message: content,
          });
          response = response ? JSON.parse(response) : null;
        } else {
          console.log("websocketSessionId", websocketSessionId, id);
          const [error, res] = await Post(
            `/chat/${newChat?._id}/_send`,
            {
              message: content,
            },
            {
              search: isSearchActive,
              deep_thinking: isDeepThinkActive,
              mcp: isMCPActive,
              datasource: sourceDataIds?.join(",") || "",
              mcp_servers: MCPIds?.join(",") || "",
              assistant_id: currentAssistant?._id || '',
            },
            {
              "WEBSOCKET-SESSION-ID": websocketSessionId || id,
            }
          );

          if (error) {
            console.error("_cancel", error);
            return;
          }
          response = res;
        }
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
        console.error("sendMessage:", error);
      }
    },
    [
      currentServiceId,
      sourceDataIds,
      MCPIds,
      isSearchActive,
      isDeepThinkActive,
      isMCPActive,
      curIdRef,
      setActiveChat,
      setCurChatEnd,
      changeInput,
      websocketSessionId,
      currentAssistant,
    ]
  );

  const handleSendMessage = useCallback(
    async (content: string, activeChat?: Chat, id?: string) => {
      if (!activeChat?._id || !content) return;
      setQuestion(content);

      setTimedoutShow(false);

      await chatHistory(activeChat, (chat) => sendMessage(content, chat, id));
    },
    [
      chatHistory,
      sendMessage,
      setQuestion,
      setTimedoutShow,
      clearAllChunkData,
    ]
  );

  const openSessionChat = useCallback(
    async (chat: Chat) => {
      if (!chat?._id) return;
      try {
        let response: any;
        if (isTauri) {
          if (!currentServiceId) return;
          response = await platformAdapter.commands("open_session_chat", {
            serverId: currentServiceId,
            sessionId: chat?._id,
          });
          response = response ? JSON.parse(response) : null;
        } else {
          const [error, res] = await Post(`/chat/${chat?._id}/_open`, {});
          if (error) {
            console.error("_open", error);
            return null;
          }
          response = res;
        }

        console.log("_open", response);
        return response;
      } catch (error) {
        console.error("open_session_chat:", error);
        return null;
      }
    },
    [currentServiceId]
  );

  const getChatHistory = useCallback(async () => {
    let response: any;
    if (isTauri) {
      try {
        if (!currentServiceId) return [];
        response = await platformAdapter.commands("chat_history", {
          serverId: currentServiceId,
          from: 0,
          size: 20,
          query: keyword,
        });
      } catch (error) {
        console.error("chat_history", error);
      }
      response = response ? JSON.parse(response) : null;
    } else {
      const [error, res] = await Get(`/chat/_history`, {
        from: 0,
        size: 20,
      });
      if (error) {
        console.error("_history", error);
        return [];
      }
      response = res;
    }
    console.log("_history", response);
    const hits = response?.hits?.hits || [];

    setChats(hits);
    return hits;
  }, [currentServiceId, keyword]);

  useEffect(() => {
    showChatHistory && connected && getChatHistory();
  }, [showChatHistory, connected, getChatHistory]);

  const createChatWindow = useCallback(async (createWin: any) => {
    if (isTauri) {
      createWin &&
        createWin({
          label: "chat",
          title: "Coco Chat",
          dragDropEnabled: true,
          center: true,
          width: 1000,
          height: 800,
          minWidth: 1000,
          minHeight: 800,
          alwaysOnTop: false,
          skipTaskbar: false,
          decorations: true,
          closable: true,
          url: "/ui/chat",
        });
    }
  }, []);

  const handleSearch = (keyword: string) => {
    setKeyword(keyword);
  };

  const handleRename = async (chatId: string, title: string) => {
    if (!currentServiceId) return;

    await platformAdapter.commands("update_session_chat", {
      serverId: currentServiceId,
      sessionId: chatId,
      title,
    });
  };

  const handleDelete = async (id: string) => {
    if (!currentServiceId) return;

    await platformAdapter.commands("delete_session_chat", currentServiceId, id);
  };

  return {
    chatClose,
    cancelChat,
    chatHistory,
    createNewChat,
    sendMessage,
    handleSendMessage,
    openSessionChat,
    getChatHistory,
    createChatWindow,
    handleSearch,
    handleRename,
    handleDelete,
  };
}
