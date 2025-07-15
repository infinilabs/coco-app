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
import { SendMessageParams } from "@/components/Assistant/Chat";
import { isEmpty } from "lodash-es";

export function useChatActions(
  setActiveChat: (chat: Chat | undefined) => void,
  setCurChatEnd: (value: boolean) => void,
  setTimedoutShow: (value: boolean) => void,
  clearAllChunkData: () => void,
  setQuestion: (value: string) => void,
  curIdRef: React.MutableRefObject<string>,
  setChats: (chats: Chat[]) => void,
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>,
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

  const createNewChat = useCallback(
    async (activeChat?: Chat, params?: SendMessageParams) => {
      const { message, attachments } = params || {};

      if (!message || isEmpty(attachments)) return;

      setTimedoutShow(false);
      await chatClose(activeChat);
      clearAllChunkData();
      setQuestion(message);

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
          message,
          attachments,
          queryParams,
        });
      } else {
        await streamPost({
          url: "/chat/_create",
          body: { message },
          queryParams,
          onMessage: (line) => {
            console.log("⏳", line);
            handleChatCreateStreamMessage(line);
            // append to chat box
          },
        });
      }
      console.log(
        "_create",
        currentService?.id,
        message,
        attachments,
        queryParams
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
      currentAssistant,
      chatClose,
    ]
  );

  const sendMessage = useCallback(
    async (newChat: Chat, params?: SendMessageParams) => {
      if (!newChat?._id || !params) return;

      const { message, attachments } = params;

      if (!message || isEmpty(attachments)) return;

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
          message,
          attachments,
        });
      } else {
        await streamPost({
          url: `/chat/${newChat?._id}/_chat`,
          body: { message },
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
        message,
        attachments
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
    async (activeChat?: Chat, params?: SendMessageParams) => {
      if (!activeChat?._id || !params) return;

      const { message, attachments } = params;

      if (!message || isEmpty(attachments)) return;

      setQuestion(message);

      setTimedoutShow(false);

      await chatHistory(activeChat, (chat) => sendMessage(chat, params));
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
      dealMsgRef.current?.(msg);
    },
    [
      curIdRef,
      updatedChatRef,
      changeInput,
      setActiveChat,
      setCurChatEnd,
      setVisibleStartPage,
      dealMsgRef,
    ]
  );

  useEffect(() => {
    if (!isTauri || !currentService?.id) return;

    const unlisten_message = platformAdapter.listenEvent(
      `chat-create-stream`,
      (event) => {
        const msg = event.payload as string;
        //console.log("chat-create-stream", msg);
        handleChatCreateStreamMessage(msg);
      }
    );

    const unlisten_error = platformAdapter.listenEvent(
      `chat-create-error`,
      (event) => {
        console.error("chat-create-error", event.payload);
      }
    );

    return () => {
      unlisten_message.then((fn) => fn());
      unlisten_error.then((fn) => fn());
    };
  }, [currentService?.id, dealMsgRef, updatedChatRef.current]);

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
