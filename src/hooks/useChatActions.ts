import { useCallback, useEffect, useState, useRef } from "react";

import type { Chat } from "@/types/chat";
import { useAppStore } from "@/stores/appStore";
import { Get, Post } from "@/api/axiosRequest";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import { useAuthStore } from "@/stores/authStore";
import { unrequitable } from "@/utils";
import { streamPost } from "@/api/streamFetch";

export function useChatActions(
  setActiveChat: (chat: Chat | undefined) => void,
  setCurChatEnd: (value: boolean) => void,
  setTimedoutShow: (value: boolean) => void,
  clearAllChunkData: () => void,
  setQuestion: (value: string) => void,
  curIdRef: React.MutableRefObject<string>,
  setChats: (chats: Chat[]) => void,
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>,
  isChatPage: boolean,
  isSearchActive?: boolean,
  isDeepThinkActive?: boolean,
  isMCPActive?: boolean,
  changeInput?: (val: string) => void,
  showChatHistory?: boolean
) {
  const isCurrentLogin = useAuthStore((state) => state.isCurrentLogin);

  const isTauri = useAppStore((state) => state.isTauri);
  const {
    currentAssistant,
    setCurrentAssistant,
    assistantList,
    setVisibleStartPage,
    currentService,
  } = useConnectStore();
  const sourceDataIds = useSearchStore((state) => state.sourceDataIds);
  const MCPIds = useSearchStore((state) => state.MCPIds);

  const [keyword, setKeyword] = useState("");
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  // Add a ref at the beginning of the useChatActions function to store the listener.
  const unlistenersRef = useRef<{
    message?: () => void;
    chatMessage?: () => void;
    error?: () => void;
  }>({});

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

      // Stop listening for streaming data.
      if (unlistenersRef.current.message) {
        unlistenersRef.current.message();
        unlistenersRef.current.message = undefined;
      }
      if (unlistenersRef.current.chatMessage) {
        unlistenersRef.current.chatMessage();
        unlistenersRef.current.chatMessage = undefined;
      }
      if (unlistenersRef.current.error) {
        unlistenersRef.current.error();
        unlistenersRef.current.error = undefined;
      }

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

  const updatedChatRef = useRef<Chat | null>(null);

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
      updatedChatRef.current = updatedChat;
      setActiveChat(updatedChat);
      callback && callback(updatedChat);
      setVisibleStartPage(false);
    },
    [currentService?.id, isTauri, assistantList]
  );

  const clientId = isChatPage ? "standalone" : "popup";
  const createNewChat = useCallback(
    async (value: string = "", activeChat?: Chat) => {
      const requestId = `${Date.now()}`;
      setCurrentRequestId(requestId);

      setTimedoutShow(false);
      await chatClose(activeChat);
      clearAllChunkData();
      setQuestion(value);

      //console.log("sourceDataIds", sourceDataIds, MCPIds, id);
      const queryParams = {
        search: isSearchActive,
        deep_thinking: isDeepThinkActive,
        mcp: isMCPActive,
        datasource: sourceDataIds?.join(",") || "",
        mcp_servers: MCPIds?.join(",") || "",
        assistant_id: currentAssistant?._id || "",
      };
      if (isTauri) {
        if (!currentService?.id) return;
        await platformAdapter.commands("chat_create", {
          serverId: currentService?.id,
          message: value,
          queryParams,
          clientId: `chat-create-stream-${clientId}-${requestId}`,
        });
      } else {
        await streamPost({
          url: "/chat/_create",
          body: { message: value },
          queryParams,
          onMessage: (line) => {
            console.log("⏳", line);
            handleChatCreateStreamMessage(line);
            // append to chat box
          },
        });
      }
      console.log("_create", currentService?.id, value, queryParams);
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
      currentAssistant,
      chatClose,
    ]
  );

  const sendMessage = useCallback(
    async (content: string, newChat: Chat) => {
      if (!newChat?._id || !content) return;

      const requestId = `${Date.now()}`;
      setCurrentRequestId(requestId);

      clearAllChunkData();

      const queryParams = {
        search: isSearchActive,
        deep_thinking: isDeepThinkActive,
        mcp: isMCPActive,
        datasource: sourceDataIds?.join(",") || "",
        mcp_servers: MCPIds?.join(",") || "",
        assistant_id: currentAssistant?._id || "",
      };
      if (isTauri) {
        if (!currentService?.id) return;
        await platformAdapter.commands("chat_chat", {
          serverId: currentService?.id,
          sessionId: newChat?._id,
          queryParams,
          message: content,
          clientId: `chat-chat-stream-${clientId}`,
        });
      } else {
        await streamPost({
          url: `/chat/${newChat?._id}/_chat`,
          body: { message: content },
          queryParams,
          onMessage: (line) => {
            console.log("line", line);
            handleChatCreateStreamMessage(line);
            // append to chat box
          },
        });
      }

      console.log(
        "chat_chat",
        currentService?.id,
        newChat?._id,
        queryParams,
        content
      );
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
      currentAssistant,
    ]
  );

  const handleSendMessage = useCallback(
    async (content: string, activeChat?: Chat) => {
      if (!activeChat?._id || !content) return;
      setQuestion(content);

      setTimedoutShow(false);

      await chatHistory(activeChat, (chat) => sendMessage(content, chat));
    },
    [chatHistory, sendMessage]
  );

  const handleChatCreateStreamMessage = useCallback(
    (msg: string) => {
      if (
        msg.includes("_id") &&
        msg.includes("_source") &&
        msg.includes("result")
      ) {
        const response = JSON.parse(msg);
        console.log("first", response);
        let updatedChat: Chat;
        if (Array.isArray(response)) {
          curIdRef.current = response[0]?._id;
          updatedChat = {
            ...updatedChatRef.current,
            messages: [
              ...(updatedChatRef.current?.messages || []),
              ...(response || []),
            ],
          };
          console.log("array", updatedChat, updatedChatRef.current?.messages);
        } else {
          const newChat: Chat = response;
          curIdRef.current = response?.payload?.id;

          newChat._source = {
            ...response?.payload,
          };
          updatedChat = {
            ...newChat,
            messages: [newChat],
          };
        }

        changeInput && changeInput("");
        setActiveChat(updatedChat);
        setCurChatEnd(false);
        setVisibleStartPage(false);
        return;
      }

      console.log("msg", msg);
      dealMsgRef.current?.(msg);
    },
    [changeInput, setActiveChat, setCurChatEnd, setVisibleStartPage]
  );

  useEffect(() => {
    if (!isTauri || !currentService?.id) return;

    // Clean up previous listeners.
    if (unlistenersRef.current.message) {
      unlistenersRef.current.message();
    }
    if (unlistenersRef.current.chatMessage) {
      unlistenersRef.current.chatMessage();
    }
    if (unlistenersRef.current.error) {
      unlistenersRef.current.error();
    }

    const setupListeners = async () => {
      const unlisten_message = await platformAdapter.listenEvent(
        `chat-create-stream-${clientId}-${currentRequestId}`,
        (event) => {
          const msg = event.payload as string;
          console.log(
            `chat-create-stream-${clientId}-${currentRequestId}`,
            msg
          );
          handleChatCreateStreamMessage(msg);
        }
      );

      const unlisten_chat_message = await platformAdapter.listenEvent(
        `chat-chat-stream-${clientId}-${currentRequestId}`,
        (event) => {
          const msg = event.payload as string;
          console.log(`chat-chat-stream-${clientId}-${currentRequestId}`, msg);
          handleChatCreateStreamMessage(msg);
        }
      );

      const unlisten_error = await platformAdapter.listenEvent(
        `chat-create-error`,
        (event) => {
          console.error("chat-create-error", event.payload);
        }
      );

      // Store the listener references.
      unlistenersRef.current = {
        message: unlisten_message,
        chatMessage: unlisten_chat_message,
        error: unlisten_error,
      };
    };

    setupListeners();

    return () => {
      if (unlistenersRef.current.message) {
        unlistenersRef.current.message();
      }
      if (unlistenersRef.current.chatMessage) {
        unlistenersRef.current.chatMessage();
      }
      if (unlistenersRef.current.error) {
        unlistenersRef.current.error();
      }
      unlistenersRef.current = {};
    };
  }, [currentService?.id, clientId, currentRequestId]);

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
      if (unrequitable()) {
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
  }, [
    currentService?.id,
    keyword,
    isTauri,
    currentService?.enabled,
    isCurrentLogin,
  ]);

  useEffect(() => {
    if (showChatHistory) {
      getChatHistory();
    }
  }, [showChatHistory, getChatHistory, currentService?.id]);

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
