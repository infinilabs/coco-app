import { useCallback, useEffect, useState } from "react";

import type { Chat } from "@/types/chat";
import { useAppStore } from "@/stores/appStore";
import { Get, Post } from "@/api/axiosRequest";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import { useChatStore } from "@/stores/chatStore";
import { useSearchStore } from "@/stores/searchStore";
import { useAuthStore } from "@/stores/authStore";

export function useChatActions(
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
  const isCurrentLogin = useAuthStore((state) => state.isCurrentLogin);

  const isTauri = useAppStore((state) => state.isTauri);
  const addError = useAppStore((state) => state.addError);
  const {
    currentAssistant,
    setCurrentAssistant,
    assistantList,
    setVisibleStartPage,
    currentService,
  } = useConnectStore();
  const { connected } = useChatStore();
  const sourceDataIds = useSearchStore((state) => state.sourceDataIds);
  const MCPIds = useSearchStore((state) => state.MCPIds);

  const [keyword, setKeyword] = useState("");

  const chatClose = useCallback(
    async (activeChat?: Chat) => {
      if (!activeChat?._id) return;

      let response: any;
      if (isTauri) {
        if (!currentService?.id) return;
        response = await platformAdapter.commands("close_session_chat", {
          serverId: currentService?.id,
          sessionId: activeChat?._id,
        });
        response = response ? JSON.parse(response) : null;
      } else {
        const [_error, res] = await Post(`/chat/${activeChat?._id}/_close`, {});
        response = res;
      }
      console.log("_close", response);
    },
    [currentService?.id, isTauri]
  );

  const cancelChat = useCallback(
    async (activeChat?: Chat) => {
      setCurChatEnd(true);
      if (!activeChat?._id) return;
      let response: any;
      if (isTauri) {
        if (!currentService?.id) return;
        response = await platformAdapter.commands("cancel_session_chat", {
          serverId: currentService?.id,
          sessionId: activeChat?._id,
        });
        response = response ? JSON.parse(response) : null;
      } else {
        const [_error, res] = await Post(
          `/chat/${activeChat?._id}/_cancel`,
          {}
        );
        response = res;
      }
      console.log("_cancel", response);
    },
    [currentService?.id, isTauri]
  );

  // 1. handleSendMessage callback
  // 2. onSelectChat no callback
  const chatHistory = useCallback(
    async (chat: Chat, callback?: (chat: Chat) => void) => {
      if (!chat?._id) return;

      let response: any;
      if (isTauri) {
        if (!currentService?.id) return;
        response = await platformAdapter.commands("session_chat_history", {
          serverId: currentService?.id,
          sessionId: chat?._id,
          from: 0,
          size: 100,
        });
        response = response ? JSON.parse(response) : null;
      } else {
        const [_error, res] = await Get(`/chat/${chat?._id}/_history`, {
          from: 0,
          size: 100,
        });
        response = res;
      }

      const hits = response?.hits?.hits || [];
      // set current assistant
      const lastAssistantId = hits[hits.length - 1]?._source?.assistant_id;
      const matchedAssistant = assistantList?.find(
        (assistant) => assistant._id === lastAssistantId
      );
      if (matchedAssistant && !callback) {
        setCurrentAssistant(matchedAssistant);
      }
      //
      const updatedChat: Chat = {
        ...chat,
        messages: hits,
      };
      console.log("id_history", updatedChat);
      setActiveChat(updatedChat);
      callback && callback(updatedChat);
      setVisibleStartPage(false);
    },
    [currentService?.id, isTauri, assistantList]
  );

  const createNewChat = useCallback(
    async (value: string = "", activeChat?: Chat, id?: string) => {
      setTimedoutShow(false);
      await chatClose(activeChat);
      clearAllChunkData();
      setQuestion(value);

      const sessionId = websocketSessionId || id;
      if (!sessionId) {
        addError("websocketSessionId not found");
        console.error("websocketSessionId", websocketSessionId, id);
        return;
      }

      //console.log("sourceDataIds", sourceDataIds, MCPIds, websocketSessionId, id);
      const queryParams = {
        search: isSearchActive,
        deep_thinking: isDeepThinkActive,
        mcp: isMCPActive,
        datasource: sourceDataIds?.join(",") || "",
        mcp_servers: MCPIds?.join(",") || "",
        assistant_id: currentAssistant?._id || "",
      };
      let response: any;
      if (isTauri) {
        if (!currentService?.id) return;
        response = await platformAdapter.commands("new_chat", {
          serverId: currentService?.id,
          websocketId: sessionId,
          message: value,
          queryParams,
        });
      } else {
        const [_error, res] = await Post(
          "/chat/_new",
          {
            message: value,
          },
          queryParams,
          {
            "WEBSOCKET-SESSION-ID": sessionId,
          }
        );
        response = res;
      }

      console.log("_new", response);
      const newChat: Chat = response;
      curIdRef.current = response?.payload?.id;

      newChat._source = {
        ...response?.payload,
        message: value,
      };
      const updatedChat: Chat = {
        ...newChat,
        messages: [newChat],
      };

      changeInput && changeInput("");
      setActiveChat(updatedChat);
      setCurChatEnd(false);
      setVisibleStartPage(false);
    },
    [
      isTauri,
      currentService?.id,
      sourceDataIds,
      MCPIds,
      isSearchActive,
      isDeepThinkActive,
      isMCPActive,
      curIdRef,
      websocketSessionId,
      currentAssistant,
      chatClose,
    ]
  );

  const sendMessage = useCallback(
    async (content: string, newChat: Chat, id?: string) => {
      if (!newChat?._id || !content) return;

      clearAllChunkData();

      const sessionId = websocketSessionId || id;
      if (!sessionId) {
        addError("websocketSessionId not found");
        console.error("websocketSessionId", websocketSessionId, id);
        return;
      }

      const queryParams = {
        search: isSearchActive,
        deep_thinking: isDeepThinkActive,
        mcp: isMCPActive,
        datasource: sourceDataIds?.join(",") || "",
        mcp_servers: MCPIds?.join(",") || "",
        assistant_id: currentAssistant?._id || "",
      };
      let response: any;
      if (isTauri) {
        if (!currentService?.id) return;
        response = await platformAdapter.commands("send_message", {
          serverId: currentService?.id,
          websocketId: sessionId,
          sessionId: newChat?._id,
          queryParams,
          message: content,
        });
        response = response ? JSON.parse(response) : null;
      } else {
        const [_error, res] = await Post(
          `/chat/${newChat?._id}/_send`,
          {
            message: content,
          },
          queryParams,
          {
            "WEBSOCKET-SESSION-ID": sessionId,
          }
        );
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
      setVisibleStartPage(false);
    },
    [
      isTauri,
      currentService?.id,
      sourceDataIds,
      MCPIds,
      isSearchActive,
      isDeepThinkActive,
      isMCPActive,
      curIdRef,
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
    [chatHistory, sendMessage]
  );

  const openSessionChat = useCallback(
    async (chat: Chat) => {
      if (!chat?._id) return;
      setVisibleStartPage(false);

      let response: any;
      if (isTauri) {
        if (!currentService?.id) return;
        response = await platformAdapter.commands("open_session_chat", {
          serverId: currentService?.id,
          sessionId: chat?._id,
        });
        response = response ? JSON.parse(response) : null;
      } else {
        const [_error, res] = await Post(`/chat/${chat?._id}/_open`, {});
        response = res;
      }

      console.log("_open", response);
      return response;
    },
    [currentService?.id, isTauri]
  );

  const getChatHistory = useCallback(async () => {
    let response: any;
    if (isTauri) {
      if (!currentService?.id || !isCurrentLogin || !currentService?.enabled) {
        return setChats([]);
      }

      response = await platformAdapter.commands("chat_history", {
        serverId: currentService?.id,
        from: 0,
        size: 100,
        query: keyword,
      });

      response = response ? JSON.parse(response) : null;
    } else {
      const [_error, res] = await Get(`/chat/_history`, {
        from: 0,
        size: 100,
      });
      response = res;
    }

    console.log("_history", response);
    const hits = response?.hits?.hits || [];
    setChats(hits);
  }, [currentService?.id, keyword, isTauri, currentService?.enabled]);

  useEffect(() => {
    if (showChatHistory && connected) {
      getChatHistory()
    }
  }, [showChatHistory, connected, getChatHistory, currentService?.id]);

  const createChatWindow = useCallback(
    async (createWin: any) => {
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
    },
    [isTauri]
  );

  const handleSearch = (keyword: string) => {
    setKeyword(keyword);
  };

  const handleRename = useCallback(
    async (chatId: string, title: string) => {
      if (!currentService?.id) return;

      await platformAdapter.commands("update_session_chat", {
        serverId: currentService?.id,
        sessionId: chatId,
        title,
      });
    },
    [currentService?.id]
  );

  const handleDelete = useCallback(
    async (chatId: string) => {
      if (!currentService?.id) return;

      await platformAdapter.commands(
        "delete_session_chat",
        currentService?.id,
        chatId
      );
    },
    [currentService?.id]
  );

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
