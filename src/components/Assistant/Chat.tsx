import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { debounce } from "lodash-es";
import { listen } from "@tauri-apps/api/event";

import { ChatMessage } from "@/components/ChatMessage";
import type { Chat, IChunkData } from "./types";
import { useChatStore } from "@/stores/chatStore";
import { useWindows } from "@/hooks/useWindows";
import { ChatHeader } from "./ChatHeader";
import { Sidebar } from "@/components/Assistant/Sidebar";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
import { IServer } from "@/stores/appStore";
import FileList from "@/components/Search/FileList";
import { Greetings } from "./Greetings";
import ConnectPrompt from "./ConnectPrompt";

interface ChatAIProps {
  isTransitioned: boolean;
  isSearchActive?: boolean;
  isDeepThinkActive?: boolean;
  activeChatProp?: Chat;
  changeInput?: (val: string) => void;
  setIsSidebarOpen?: (value: boolean) => void;
  isSidebarOpen?: boolean;
  clearChatPage?: () => void;
  isChatPage?: boolean;
}

export interface ChatAIRef {
  init: (value: string) => void;
  cancelChat: () => void;
  reconnect: () => void;
  clearChat: () => void;
}

const ChatAI = memo(
  forwardRef<ChatAIRef, ChatAIProps>(
    (
      {
        isTransitioned,
        changeInput,
        isSearchActive,
        isDeepThinkActive,
        activeChatProp,
        setIsSidebarOpen,
        isSidebarOpen = false,
        clearChatPage,
        isChatPage = false,
      },
      ref
    ) => {
      if (!isTransitioned) return null;

      const { t } = useTranslation();

      useImperativeHandle(ref, () => ({
        init: init,
        cancelChat: cancelChat,
        reconnect: reconnect,
        clearChat: clearChat,
      }));

      const { createWin } = useWindows();

      const { curChatEnd, setCurChatEnd, connected, setConnected } =
        useChatStore();

      const currentService = useConnectStore((state) => state.currentService);

      const [activeChat, setActiveChat] = useState<Chat>();
      const [timedoutShow, setTimedoutShow] = useState(false);
      const [errorShow, setErrorShow] = useState(false);
      const [IsLogin, setIsLogin] = useState(true);

      const messagesEndRef = useRef<HTMLDivElement>(null);

      const curChatEndRef = useRef(curChatEnd);
      curChatEndRef.current = curChatEnd;

      const curIdRef = useRef("");

      const [isSidebarOpenChat, setIsSidebarOpenChat] = useState(isSidebarOpen);
      const [chats, setChats] = useState<Chat[]>([]);
      const sourceDataIds = useSearchStore((state) => state.sourceDataIds);
      const uploadFiles = useChatStore((state) => state.uploadFiles);

      useEffect(() => {
        activeChatProp && setActiveChat(activeChatProp);
      }, [activeChatProp]);

      const reconnect = async (server?: IServer) => {
        server = server || currentService;
        if (!server?.id) return;
        try {
          console.log("reconnect", server.id);
          await invoke("connect_to_server", { id: server.id });
          setConnected(true);
        } catch (error) {
          console.error("Failed to connect:", error);
        }
      };

      const messageTimeoutRef = useRef<NodeJS.Timeout>();

      const [Question, setQuestion] = useState<string>("");

      const [query_intent, setQuery_intent] = useState<IChunkData>();
      const deal_query_intent = useCallback((data: IChunkData) => {
        setQuery_intent((prev: IChunkData | undefined): IChunkData => {
          if (!prev) return data;
          return {
            ...prev,
            message_chunk: prev.message_chunk + data.message_chunk,
          };
        });
      }, []);

      const [fetch_source, setFetch_source] = useState<IChunkData>();
      const deal_fetch_source = useCallback((data: IChunkData) => {
        setFetch_source(data);
      }, []);

      const [pick_source, setPick_source] = useState<IChunkData>();
      const deal_pick_source = useCallback((data: IChunkData) => {
        setPick_source((prev: IChunkData | undefined): IChunkData => {
          if (!prev) return data;
          return {
            ...prev,
            message_chunk: prev.message_chunk + data.message_chunk,
          };
        });
      }, []);

      const [deep_read, setDeep_read] = useState<IChunkData>();
      const deal_deep_read = useCallback((data: IChunkData) => {
        setDeep_read((prev: IChunkData | undefined): IChunkData => {
          if (!prev) return data;
          return {
            ...prev,
            message_chunk: prev.message_chunk + "&" + data.message_chunk,
          };
        });
      }, []);

      const [think, setThink] = useState<IChunkData>();
      const deal_think = useCallback((data: IChunkData) => {
        setThink((prev: IChunkData | undefined): IChunkData => {
          if (!prev) return data;
          return {
            ...prev,
            message_chunk: prev.message_chunk + data.message_chunk,
          };
        });
      }, []);

      const [response, setResponse] = useState<IChunkData>();
      const deal_response = useCallback((data: IChunkData) => {
        setResponse((prev: IChunkData | undefined): IChunkData => {
          if (!prev) return data;
          return {
            ...prev,
            message_chunk: prev.message_chunk + data.message_chunk,
          };
        });
      }, []);

      // send、new、history
      const clearCurrentChat = useCallback(() => {
        setQuery_intent(undefined);
        setFetch_source(undefined);
        setPick_source(undefined);
        setDeep_read(undefined);
        setThink(undefined);
        setResponse(undefined);
      }, []);

      const dealMsg = useCallback(
        (msg: string) => {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }

          if (!msg.includes("PRIVATE")) return;

          messageTimeoutRef.current = setTimeout(() => {
            if (!curChatEnd) {
              console.log("AI response timeout");
              setTimedoutShow(true);
              cancelChat();
            }
          }, 60000);

          if (msg.includes("assistant finished output")) {
            clearTimeout(messageTimeoutRef.current);
            console.log("AI finished output");
            setCurChatEnd(true);
            return;
          }

          const cleanedData = msg.replace(/^PRIVATE /, "");
          try {
            const chunkData = JSON.parse(cleanedData);

            if (chunkData.reply_to_message !== curIdRef.current) return;

            // ['query_intent', 'fetch_source', 'pick_source', 'deep_read', 'think', 'response'];
            if (chunkData.chunk_type === "query_intent") {
              deal_query_intent(chunkData);
            } else if (chunkData.chunk_type === "fetch_source") {
              deal_fetch_source(chunkData);
            } else if (chunkData.chunk_type === "pick_source") {
              deal_pick_source(chunkData);
            } else if (chunkData.chunk_type === "deep_read") {
              deal_deep_read(chunkData);
            } else if (chunkData.chunk_type === "think") {
              deal_think(chunkData);
            } else if (chunkData.chunk_type === "response") {
              deal_response(chunkData);
            }
          } catch (error) {
            console.error("parse error:", error);
          }
        },
        [curChatEnd]
      );

      useEffect(() => {
        if (curChatEnd) {
          simulateAssistantResponse();
        }
      }, [curChatEnd]);

      useEffect(() => {
        let unlisten_error = null;

        if (connected) {
          setErrorShow(false);
          unlisten_error = listen("ws-error", (event) => {
            console.error("WebSocket error:", event.payload);
            setConnected(false);
            setErrorShow(true);
          });
        }

        return () => {
          unlisten_error?.then((fn) => fn());
        };
      }, [connected]);

      useEffect(() => {
        let unlisten_message = null;
        console.log("connected:", connected);
        if (connected) {
          setErrorShow(false);
          unlisten_message = listen("ws-message", (event) => {
            dealMsg(String(event.payload));
            // console.log("message:", event.payload);
          });
        }

        return () => {
          unlisten_message?.then((fn) => fn());
        };
      }, [dealMsg, connected]);

      const updatedChat = useMemo(() => {
        if (!activeChat?._id) return null;
        return {
          ...activeChat,
          messages: [...(activeChat.messages || [])],
        };
      }, [activeChat]);

      const simulateAssistantResponse = useCallback(() => {
        if (!updatedChat) return;

        console.log("updatedChat:", updatedChat);
        setActiveChat(updatedChat);
      }, [updatedChat]);

      useEffect(() => {
        if (curChatEnd) {
          simulateAssistantResponse();
        }
      }, [curChatEnd]);

      const [userScrolling, setUserScrolling] = useState(false);
      const scrollTimeoutRef = useRef<NodeJS.Timeout>();

      const scrollToBottom = useCallback(
        debounce(() => {
          if (!userScrolling) {
            const container = messagesEndRef.current?.parentElement;
            if (container) {
              container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth",
              });
            }
          }
        }, 100),
        [userScrolling]
      );

      useEffect(() => {
        const container = messagesEndRef.current?.parentElement;
        if (!container) return;

        const handleScroll = () => {
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }

          const { scrollTop, scrollHeight, clientHeight } = container;
          const isAtBottom =
            Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

          setUserScrolling(!isAtBottom);

          if (isAtBottom) {
            setUserScrolling(false);
          }

          scrollTimeoutRef.current = setTimeout(() => {
            const {
              scrollTop: newScrollTop,
              scrollHeight: newScrollHeight,
              clientHeight: newClientHeight,
            } = container;
            const nowAtBottom =
              Math.abs(newScrollHeight - newScrollTop - newClientHeight) < 10;
            if (nowAtBottom) {
              setUserScrolling(false);
            }
          }, 500);
        };

        container.addEventListener("scroll", handleScroll);
        return () => {
          container.removeEventListener("scroll", handleScroll);
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
        };
      }, []);

      useEffect(() => {
        scrollToBottom();
      }, [
        activeChat?.messages,
        query_intent?.message_chunk,
        fetch_source?.message_chunk,
        pick_source?.message_chunk,
        deep_read?.message_chunk,
        think?.message_chunk,
        response?.message_chunk,
      ]);

      const clearChat = () => {
        console.log("clearChat");
        chatClose();
        setActiveChat(undefined);
        setCurChatEnd(true);
        clearChatPage && clearChatPage();
      };

      const createNewChat = useCallback(
        async (value: string = "") => {
          setTimedoutShow(false);
          setErrorShow(false);
          chatClose();
          clearCurrentChat();
          setQuestion(value);
          try {
            // console.log("sourceDataIds", sourceDataIds);
            let response: any = await invoke("new_chat", {
              serverId: currentService?.id,
              message: value,
              queryParams: {
                search: isSearchActive,
                deep_thinking: isDeepThinkActive,
                datasource: sourceDataIds.join(","),
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
            console.log("updatedChat2", updatedChat);
            setActiveChat(updatedChat);
            setCurChatEnd(false);
          } catch (error) {
            setErrorShow(true);
            console.error("Failed to fetch user data:", error);
          }
        },
        [isSearchActive, isDeepThinkActive]
      );

      const init = (value: string) => {
        if (!curChatEnd) return;
        if (!activeChat?._id) {
          createNewChat(value);
        } else {
          handleSendMessage(value);
        }
      };

      const sendMessage = useCallback(
        async (content: string, newChat: Chat) => {
          if (!newChat?._id || !content) return;

          try {
            // console.log("sourceDataIds", sourceDataIds);
            let response: any = await invoke("send_message", {
              serverId: currentService?.id,
              sessionId: newChat?._id,
              queryParams: {
                search: isSearchActive,
                deep_thinking: isDeepThinkActive,
                datasource: sourceDataIds.join(","),
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
            console.log("updatedChat2", updatedChat);
            setActiveChat(updatedChat);
            setCurChatEnd(false);
          } catch (error) {
            setErrorShow(true);
            console.error("Failed to fetch user data:", error);
          }
        },
        [
          JSON.stringify(activeChat?.messages),
          isSearchActive,
          isDeepThinkActive,
        ]
      );

      const handleSendMessage = useCallback(
        async (content: string, newChat?: Chat) => {
          newChat = newChat || activeChat;
          if (!newChat?._id || !content) return;
          setQuestion(content);
          await chatHistory(newChat, (chat) => sendMessage(content, chat));

          setTimedoutShow(false);
          setErrorShow(false);
          clearCurrentChat();
        },
        [activeChat, sendMessage]
      );

      const chatClose = async () => {
        if (!activeChat?._id) return;
        try {
          let response: any = await invoke("close_session_chat", {
            serverId: currentService?.id,
            sessionId: activeChat?._id,
          });
          response = JSON.parse(response || "");
          console.log("_close", response);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      const cancelChat = async () => {
        setCurChatEnd(true);
        if (!activeChat?._id) return;
        try {
          let response: any = await invoke("cancel_session_chat", {
            serverId: currentService?.id,
            sessionId: activeChat?._id,
          });
          response = JSON.parse(response || "");
          console.log("_cancel", response);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      async function openChatAI() {
        if (isTauri()) {
          createWin &&
            createWin({
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
      }

      useEffect(() => {
        return () => {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }
          chatClose();
          setActiveChat(undefined);
          setCurChatEnd(true);
          scrollToBottom.cancel();
        };
      }, []);

      const chatHistory = async (
        chat: Chat,
        callback?: (chat: Chat) => void
      ) => {
        try {
          let response: any = await invoke("session_chat_history", {
            serverId: currentService?.id,
            sessionId: chat?._id,
            from: 0,
            size: 20,
          });
          response = JSON.parse(response || "");
          console.log("id_history", response);
          const hits = response?.hits?.hits || [];
          const updatedChat: Chat = {
            ...chat,
            messages: hits,
          };
          console.log("id_history2", updatedChat);
          setActiveChat(updatedChat);
          callback && callback(updatedChat);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      const onSelectChat = async (chat: any) => {
        chatClose();
        clearCurrentChat();
        try {
          let response: any = await invoke("open_session_chat", {
            serverId: currentService?.id,
            sessionId: chat?._id,
          });
          response = JSON.parse(response || "");
          console.log("_open", response);
          chatHistory(response);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      const deleteChat = (chatId: string) => {
        setChats((prev) => prev.filter((chat) => chat._id !== chatId));
        if (activeChat?._id === chatId) {
          const remainingChats = chats.filter((chat) => chat._id !== chatId);
          if (remainingChats.length > 0) {
            setActiveChat(remainingChats[0]);
          } else {
            init("");
          }
        }
      };

      const handleOutsideClick = useCallback((e: MouseEvent) => {
        const sidebar = document.querySelector("[data-sidebar]");
        const button = document.querySelector("[data-sidebar-button]");
        if (
          sidebar &&
          !sidebar.contains(e.target as Node) &&
          button &&
          !button.contains(e.target as Node)
        ) {
          setIsSidebarOpenChat(false);
        }
      }, []);

      useEffect(() => {
        if (isSidebarOpenChat) {
          document.addEventListener("click", handleOutsideClick);
        }
        return () => {
          document.removeEventListener("click", handleOutsideClick);
        };
      }, [isSidebarOpenChat, handleOutsideClick]);

      const getChatHistory = async () => {
        if (!currentService?.id) return;
        try {
          let response: any = await invoke("chat_history", {
            serverId: currentService?.id,
            from: 0,
            size: 20,
          });
          response = JSON.parse(response || "");
          console.log("_history", response);
          const hits = response?.hits?.hits || [];
          setChats(hits);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      useEffect(() => {
        currentService && !setIsSidebarOpen && getChatHistory();
      }, [currentService]);

      return (
        <div
          data-tauri-drag-region
          className={`h-full flex flex-col rounded-xl overflow-hidden`}
        >
          {setIsSidebarOpen ? null : (
            <div
              data-sidebar
              className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 ease-in-out 
              ${
                isSidebarOpenChat
                  ? "translate-x-0"
                  : "-translate-x-[calc(100%)]"
              }
              md:relative md:translate-x-0 bg-gray-100 dark:bg-gray-800
              border-r border-gray-200 dark:border-gray-700 rounded-tl-xl rounded-bl-xl
              overflow-hidden`}
            >
              <Sidebar
                chats={chats}
                activeChat={activeChat}
                onNewChat={clearChat}
                onSelectChat={onSelectChat}
                onDeleteChat={deleteChat}
              />
            </div>
          )}
          <ChatHeader
            onCreateNewChat={clearChat}
            onOpenChatAI={openChatAI}
            setIsSidebarOpen={() => {
              setIsSidebarOpenChat(!isSidebarOpenChat);
              setIsSidebarOpen && setIsSidebarOpen(!isSidebarOpenChat);
            }}
            isSidebarOpen={isSidebarOpenChat}
            activeChat={activeChat}
            reconnect={reconnect}
            isChatPage={isChatPage}
            setIsLogin={setIsLogin}
          />
          {IsLogin ? (
            <div className="flex flex-col h-full justify-between overflow-hidden">
              <div className="flex-1 w-full overflow-x-hidden overflow-y-auto border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.15)] custom-scrollbar relative">
                <Greetings />
                {activeChat?.messages?.map((message, index) => (
                  <ChatMessage
                    key={message._id + index}
                    message={message}
                    isTyping={false}
                    onResend={handleSendMessage}
                  />
                ))}
                {(query_intent ||
                  fetch_source ||
                  pick_source ||
                  deep_read ||
                  think ||
                  response) &&
                activeChat?._id ? (
                  <ChatMessage
                    key={"current"}
                    message={{
                      _id: "current",
                      _source: {
                        type: "assistant",
                        message: "",
                        question: Question,
                      },
                    }}
                    onResend={handleSendMessage}
                    isTyping={!curChatEnd}
                    query_intent={query_intent}
                    fetch_source={fetch_source}
                    pick_source={pick_source}
                    deep_read={deep_read}
                    think={think}
                    response={response}
                  />
                ) : null}
                {timedoutShow ? (
                  <ChatMessage
                    key={"timedout"}
                    message={{
                      _id: "timedout",
                      _source: {
                        type: "assistant",
                        message: t("assistant.chat.timedout"),
                        question: Question,
                      },
                    }}
                    onResend={handleSendMessage}
                    isTyping={false}
                  />
                ) : null}
                {errorShow ? (
                  <ChatMessage
                    key={"error"}
                    message={{
                      _id: "error",
                      _source: {
                        type: "assistant",
                        message: t("assistant.chat.error"),
                        question: Question,
                      },
                    }}
                    onResend={handleSendMessage}
                    isTyping={false}
                  />
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              {uploadFiles.length > 0 && (
                <div className="max-h-[120px] overflow-auto p-2">
                  <FileList />
                </div>
              )}
            </div>
          ) : (
            <ConnectPrompt />
          )}
        </div>
      );
    }
  )
);

export default ChatAI;
