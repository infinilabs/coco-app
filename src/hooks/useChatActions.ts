import { useCallback } from "react";

import type { Chat } from "@/components/Assistant/types";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { Get, Post } from "@/api/axiosRequest";

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
  const isTauri = useAppStore((state) => state.isTauri);

  const chatClose = useCallback(async (activeChat?: Chat) => {
    if (!activeChat?._id) return;
    try {
      let response: any
      if (isTauri) {
        response = await platformAdapter.invokeBackend("close_session_chat", {
          serverId: currentServiceId,
          sessionId: activeChat?._id,
        });
        response = JSON.parse(response || "");
      } else {
        const [error, res] = await Post(`/chat/${activeChat?._id}/_close`, {})
        if (error) {
          console.error('_close', error);
          return
        }
        response = res
      }
      
      console.log("_close", response);
    } catch (error) {
      console.error("chatClose:", error);
    }
  }, [currentServiceId]);

  const cancelChat = useCallback(async (activeChat?: Chat) => {
    setCurChatEnd(true);
    if (!activeChat?._id) return;
    try {
      let response: any
      if (isTauri) {
        response = await platformAdapter.invokeBackend("cancel_session_chat", {
          serverId: currentServiceId,
          sessionId: activeChat?._id,
        });
        response = JSON.parse(response || "");
      } else {
        const [error, res] = await Post(`/chat/${activeChat?._id}/_cancel`, {})
        if (error) {
          console.error('_cancel', error);
          return
        }
        response = res
      }
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
      let response: any
      if (isTauri) {
        response = await platformAdapter.invokeBackend("session_chat_history", {
          serverId: currentServiceId,
          sessionId: chat?._id,
          from: 0,
          size: 20,
        });
        response = JSON.parse(response || "");
      } else {
        const [error, res] = await Get(`/chat/${chat?._id}/_history`, {
          from: 0,
          size: 20,
        })
        if (error) {
          console.error('_cancel', error);
          return
        }
        response = res
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
  }, [currentServiceId, setActiveChat]);

  const createNewChat = useCallback(
    async (value: string = "", activeChat?: Chat) => {
      setTimedoutShow(false);
      setErrorShow(false);
      chatClose(activeChat);
      clearAllChunkData();
      setQuestion(value);
      try {
        let response: any
        if (isTauri) {
          response = await platformAdapter.invokeBackend("new_chat", {
            serverId: currentServiceId,
            message: value,
            queryParams: {
              search: isSearchActive,
              deep_thinking: isDeepThinkActive,
              datasource: sourceDataIds?.join(",") || "",
            },
          });

        } else {
          const [error, res] = await Post('/chat/_new', {
            message: value,
          }, {
            search: isSearchActive,
            deep_thinking: isDeepThinkActive,
            datasource: sourceDataIds?.join(",") || "",
          })
          if (error) {
            console.error('_new', error);
            return
          }
          response = res
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
        setErrorShow(true);
        console.error("createNewChat:", error);
      }
    },
    [currentServiceId, sourceDataIds, isSearchActive, isDeepThinkActive, curIdRef]
  );

  const sendMessage = useCallback(
    async (content: string, newChat: Chat) => {
      if (!newChat?._id || !content) return;
      clearAllChunkData();
      try {
        let response: any
        if (isTauri) {
          response = await platformAdapter.invokeBackend("send_message", {
            serverId: currentServiceId,
            sessionId: newChat?._id,
            queryParams: {
              search: isSearchActive,
              deep_thinking: isDeepThinkActive,
              datasource: sourceDataIds?.join(",") || "",
            },
            message: content,
            // headers: {
            //   "WEBSOCKET-SESSION-ID": websocketIdRef.current,
            // },
          });
          response = JSON.parse(response || "");
        } else {
          const [error, res] = await Post(`/chat/${newChat?._id}/_send`, {
            message: content
          }, {
            search: isSearchActive,
            deep_thinking: isDeepThinkActive,
            datasource: sourceDataIds?.join(",") || "",
          })
          if (error) {
            console.error('_cancel', error);
            return
          }
          response = res
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

      await chatHistory(activeChat, (chat) => sendMessage(content, chat));
    },
    [chatHistory, sendMessage, setQuestion, setTimedoutShow, setErrorShow, clearAllChunkData]
  );

  const openSessionChat = useCallback(async (chat: Chat) => {
    try {
      let response: any
      if (isTauri) {
        response = await platformAdapter.invokeBackend("open_session_chat", {
          serverId: currentServiceId,
          sessionId: chat?._id,
        });
        response = JSON.parse(response || "");
      } else {
        const [error, res] = await Post(`/chat/${chat?._id}/_open`, {})
        if (error) {
          console.error('_open', error);
          return
        }
        response = res
      }
      
      console.log("_open", response);
      return response;
    } catch (error) {
      console.error("open_session_chat:", error);
      return null;
    }
  }, [currentServiceId]);

  const getChatHistory = useCallback(async () => {
    try {
      let response: any
      if (isTauri) {
        if (!currentServiceId) return [];
        response = await platformAdapter.invokeBackend("chat_history", {
          serverId: currentServiceId,
          from: 0,
          size: 20,
        });
        response = JSON.parse(response || "");
      } else {
        const [error, res] = await Get(`/chat/_history`, {
          from: 0,
          size: 20,
        })
        if (error) {
          console.error('_history', error);
          return
        }
        response = res
      }
      console.log("_history", response);
      const hits = response?.hits?.hits || [];
      return hits;
    } catch (error) {
      console.error("chat_history:", error);
      return [];
    }
  }, [currentServiceId]);

  const createChatWindow = useCallback(async (createWin: any) => {
    createWin && createWin({
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