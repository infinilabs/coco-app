import { useCallback, useEffect, useState, useRef, useMemo } from "react";

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
  curSessionIdRef: React.MutableRefObject<string>,
  setChats: (chats: Chat[]) => void,
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>,
  isChatPage?: boolean,
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

      curSessionIdRef.current = chat?._id;
      let response: any;
      if (isTauri) {
        if (!currentService?.id) return;
        response = await platformAdapter.commands("session_chat_history", {
          serverId: currentService?.id,
          sessionId: chat?._id,
          from: 0,
          size: 1000,
        });
        response = response ? JSON.parse(response) : null;
      } else {
        const [_error, res] = await Get(`/chat/${chat?._id}/_history`, {
          from: 0,
          size: 1000,
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

  // Modify the clientId generation logic to include the instance ID.
  const clientId = useMemo(() => {
    const timestamp = Date.now();
    const pageType = isChatPage ? "standalone-chat" : "search-chat";
    return `${pageType}-${timestamp}`;
  }, [isChatPage]);

  const createNewChat = useCallback(
    async (value: string = "", activeChat?: Chat) => {
      if (!value) return;

      // 1. Set up the listener first
      await setupListeners();

      // 2. Update the status again
      changeInput && changeInput("");
      setCurChatEnd(false);
      setVisibleStartPage(false);
      setTimedoutShow(false);

      // 3. Cleaning and preparation
      await chatClose(activeChat);
      clearAllChunkData();
      setQuestion(value);

      // 4. request API
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
          clientId: `chat-stream-${clientId}`,
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
      currentAssistant,
      chatClose,
      clientId,
    ]
  );

  const sendMessage = useCallback(
    async (content: string, newChat: Chat) => {
      if (!newChat?._id || !content) return;

      // 1.
      await setupListeners();

      // 2.
      changeInput && changeInput("");
      setCurChatEnd(false);
      setVisibleStartPage(false);
      setTimedoutShow(false);

      // 3.
      clearAllChunkData();
      setQuestion(content);

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
          clientId: `chat-stream-${clientId}`,
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
      changeInput,
      currentAssistant,
      clientId,
    ]
  );

  const handleSendMessage = useCallback(
    async (content: string, activeChat?: Chat) => {
      if (!activeChat?._id || !content) return;

      await chatHistory(activeChat, (chat) => sendMessage(content, chat));
    },
    [chatHistory, sendMessage]
  );

  const handleChatCreateStreamMessage = useCallback(
    (msg: string) => {
      if (
        msg.includes(`"user"`) &&
        msg.includes("_source") &&
        msg.includes("result")
      ) {
        try {
          const response = JSON.parse(msg);
          console.log("first", response);

          let updatedChat: Chat;
          if (Array.isArray(response)) {
            curSessionIdRef.current = response[0]?._source?.session_id;
            console.log("first-curSessionIdRef", curSessionIdRef.current);
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
            curSessionIdRef.current = response?._source?.session_id;
            console.log("first-curSessionIdRef", curSessionIdRef.current);

            newChat._source = {
              ...response?.payload,
            };
            updatedChat = {
              ...newChat,
              messages: [newChat],
            };
          }

          setActiveChat(updatedChat);
          return;
        } catch (error) {
          console.error("Failed to parse JSON:", error, "Raw message:", msg);
          return;
        }
      }

      dealMsgRef.current?.(msg);
    },
    [changeInput, setActiveChat, setCurChatEnd, setVisibleStartPage]
  );

  const cleanupListeners = useCallback(() => {
  if (unlistenersRef.current.chatMessage) {
    unlistenersRef.current.chatMessage();
  }
  if (unlistenersRef.current.error) {
    unlistenersRef.current.error();
  }
  unlistenersRef.current = {};
}, []);

  const setupListeners = useCallback(async () => {
    cleanupListeners();

    console.log("setupListeners", clientId);
    const unlisten_chat_message = await platformAdapter.listenEvent(
      `chat-stream-${clientId}`,
      (event) => {
        const msg = event.payload as string;
        try {
          console.log("msg:", JSON.parse(msg));
          console.log("user:", msg.includes(`"user"`));
          console.log("_source:", msg.includes("_source"));
          console.log("result:", msg.includes("result"));
          console.log("");
          console.log("");
          console.log("");
          console.log("");
          console.log("");
        } catch (error) {
          console.error("Failed to parse JSON in listener:", error);
        }

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
      chatMessage: unlisten_chat_message,
      error: unlisten_error,
    };
  }, [currentService?.id, clientId, handleChatCreateStreamMessage]);

  useEffect(() => {
    if (!isTauri || !currentService?.id) return;

    return () => {
      cleanupListeners();
    };
  }, [currentService?.id]);

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
        size: 1000,
        query: keyword,
      });

      response = response ? JSON.parse(response) : null;
    } else {
      const [_error, res] = await Get(`/chat/_history`, {
        from: 0,
        size: 1000,
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
