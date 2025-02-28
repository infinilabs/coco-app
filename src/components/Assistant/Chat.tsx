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

import { ChatMessage } from "./ChatMessage";
import type { Chat, IChunkData } from "./types";
import { useChatStore } from "@/stores/chatStore";
import { useWindows } from "@/hooks/useWindows";
import { ChatHeader } from "./ChatHeader";
import { Sidebar } from "@/components/Assistant/Sidebar";
import { useConnectStore } from "@/stores/connectStore";
import { useSearchStore } from "@/stores/searchStore";
// import { QueryIntent } from "./QueryIntent";

interface ChatAIProps {
  isTransitioned: boolean;
  isSearchActive?: boolean;
  isDeepThinkActive?: boolean;
  activeChatProp?: Chat;
  changeInput?: (val: string) => void;
  setIsSidebarOpen?: (value: boolean) => void;
  isSidebarOpen?: boolean;
  clearChatPage?: () => void;
}

export interface ChatAIRef {
  init: (value: string) => void;
  cancelChat: () => void;
  connected: boolean;
  reconnect: () => void;
  handleSendMessage: (value: string) => void;
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
      },
      ref
    ) => {
      if (!isTransitioned) return null;

      const { t } = useTranslation();

      useImperativeHandle(ref, () => ({
        init: init,
        cancelChat: cancelChat,
        connected: connected,
        reconnect: reconnect,
        handleSendMessage: handleSendMessage,
        clearChat: clearChat,
      }));

      const { createWin } = useWindows();

      const {
        curChatEnd,
        setCurChatEnd,
        connected,
        setConnected,
        messages,
        setMessages,
      } = useChatStore();
      const currentService = useConnectStore((state) => state.currentService);

      const [activeChat, setActiveChat] = useState<Chat>();
      const [isTyping, setIsTyping] = useState(false);
      const [timedoutShow, setTimedoutShow] = useState(false);
      const [errorShow, setErrorShow] = useState(false);
      const messagesEndRef = useRef<HTMLDivElement>(null);

      const [curMessage, setCurMessage] = useState("");

      const curChatEndRef = useRef(curChatEnd);
      curChatEndRef.current = curChatEnd;

      const curIdRef = useRef("");

      const [isSidebarOpenChat, setIsSidebarOpenChat] = useState(isSidebarOpen);
      const [chats, setChats] = useState<Chat[]>([]);
      const sourceDataIds = useSearchStore((state) => state.sourceDataIds);

      useEffect(() => {
        activeChatProp && setActiveChat(activeChatProp);
      }, [activeChatProp]);

      const handleMessageChunk = useCallback((chunk: string) => {
        setCurMessage((prev) => prev + chunk);
      }, []);

      const reconnect = async () => {
        if (!currentService?.id) return;
        try {
          await invoke("connect_to_server", { id: currentService?.id });
          setConnected(true);
        } catch (error) {
          console.error("Failed to connect:", error);
        }
      };

      const messageTimeoutRef = useRef<NodeJS.Timeout>();

      const [currentChunkType, setCurrentChunkType] = useState<
        "source" | "think" | "response" | null
      >(null);
      const [currentChunkContent, setCurrentChunkContent] = useState("");

      const handleChunkContent = useCallback(
        (type: string, content: string) => {
          switch (type) {
            case "source":
              handleMessageChunk(`<Source total="1">${content}</Source>\n`);
              break;
            case "think":
              handleMessageChunk(`<Think>${content}</Think>\n`);
              break;
            case "response":
              handleMessageChunk(content);
              break;
          }
        },
        [handleMessageChunk]
      );

      const [showThinkTyping, setShowThinkTyping] = useState(false);

      const [thinkTypeBuffers, setThinkTypeBuffers] = useState<
        Record<string, string>
      >({});

      const sourceContentRef = useRef<string[]>([]);

      const [_query_intent, setQuery_intent] = useState<IChunkData | null>(null);
      const deal_query_intent = useCallback((data: IChunkData) => {
        setQuery_intent((prev: IChunkData | null): IChunkData => {
          if (!prev) return data;
          return {
            ...prev,
            message_chunk: prev.message_chunk + data.message_chunk,
          };
        });
        // data = {
        //   session_id: "cv0i7802sdb2vvonbneg",
        //   message_id: "cv0i7882sdb2vvonbng0",
        //   message_type: "assistant",
        //   reply_to_message: "cv0i7802sdb2vvonbnf0",
        //   chunk_sequence: 1,
        //   chunk_type: "query_intent",
        //   message_chunk: "\u003cJSON",
        // };
      }, []);

      const dealMsg = useCallback(
        (msg: string) => {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }

          if (!msg.includes("PRIVATE")) return;

          messageTimeoutRef.current = setTimeout(() => {
            if (!curChatEnd && isTyping) {
              console.log("AI response timeout");
              setTimedoutShow(true);
              cancelChat();
            }
          }, 30000);

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
              try {
                const prefix = chunkData.message_chunk.split("<Payload")[0];
                const payloadMatch = chunkData.message_chunk.match(
                  /<Payload[^>]*>([\s\S]*?)<\/Payload>/
                );
                const sourceTag = payloadMatch
                  ? `<Source type="${chunkData.chunk_type}" total="${
                      chunkData.message_chunk.match(/total=(\d+)/)?.[1] || "0"
                    }">${prefix}${payloadMatch[0]}</Source>\n`
                  : `<Source type="${chunkData.chunk_type}">${chunkData.message_chunk}</Source>\n`;

                if (!sourceContentRef.current.includes(sourceTag)) {
                  sourceContentRef.current.push(sourceTag);
                  handleMessageChunk(sourceTag);
                }
              } catch (e) {
                console.error("Failed to parse source data:", e);
                const sourceTag = `<Source type="${chunkData.chunk_type}">${chunkData.message_chunk}</Source>\n`;
                if (!sourceContentRef.current.includes(sourceTag)) {
                  sourceContentRef.current.push(sourceTag);
                  handleMessageChunk(sourceTag);
                }
              }
            } else if (chunkData.chunk_type === "pick_source") {
              try {
                const prefix = chunkData.message_chunk.split("<Payload")[0];
                const payloadMatch = chunkData.message_chunk.match(
                  /<Payload[^>]*>([\s\S]*?)<\/Payload>/
                );
                const sourceTag = payloadMatch
                  ? `<Source type="${chunkData.chunk_type}" total="${
                      chunkData.message_chunk.match(/total=(\d+)/)?.[1] || "0"
                    }">${prefix}${payloadMatch[0]}</Source>\n`
                  : `<Source type="${chunkData.chunk_type}">${chunkData.message_chunk}</Source>\n`;

                if (!sourceContentRef.current.includes(sourceTag)) {
                  sourceContentRef.current.push(sourceTag);
                  handleMessageChunk(sourceTag);
                }
              } catch (e) {
                console.error("Failed to parse source data:", e);
                const sourceTag = `<Source type="${chunkData.chunk_type}">${chunkData.message_chunk}</Source>\n`;
                if (!sourceContentRef.current.includes(sourceTag)) {
                  sourceContentRef.current.push(sourceTag);
                  handleMessageChunk(sourceTag);
                }
              }
            } else if (
              chunkData.chunk_type === "think" ||
              !["fetch_source", "pick_source", "response"].includes(
                chunkData.chunk_type
              )
            ) {
              setShowThinkTyping(true);
              const chunkType = chunkData.chunk_type || "unknown";

              setThinkTypeBuffers((prev) => {
                const newBuffers = {
                  ...prev,
                  [chunkType]:
                    (prev[chunkType] || "") + chunkData.message_chunk,
                };
                return newBuffers;
              });

              setCurMessage(() => {
                const sourceContent = sourceContentRef.current.join("\n");

                let message = sourceContent;
                if (message && !message.endsWith("\n")) {
                  message += "\n";
                }

                Object.entries(thinkTypeBuffers).forEach(([type, content]) => {
                  message += `<Think type="${type}">${content}</Think>\n`;
                });

                return message;
              });
            } else if (chunkData.chunk_type === "response") {
              handleMessageChunk(chunkData.message_chunk);
            }

            setCurrentChunkType(chunkData.chunk_type);
          } catch (error) {
            console.error("parse error:", error);
          }
        },
        [curChatEnd, isTyping, thinkTypeBuffers, handleMessageChunk]
      );

      useEffect(() => {
        if (curChatEnd) {
          setShowThinkTyping(false);
          setThinkTypeBuffers({});
          setCurrentChunkType(null);
          simulateAssistantResponse();
        }
      }, [curChatEnd, setShowThinkTyping, setCurrentChunkType]);

      useEffect(() => {
        let unlisten_error = null;

        if (!connected) {
          console.log("reconnect", 222222);
          reconnect();
        } else {
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
        if (connected) {
          setErrorShow(false);
          unlisten_message = listen("ws-message", (event) => {
            dealMsg(String(event.payload));
          });
        }

        return () => {
          unlisten_message?.then((fn) => fn());
        };
      }, [dealMsg, connected]);

      useEffect(() => {
        if (curChatEnd && currentChunkContent) {
          handleChunkContent(currentChunkType || "", currentChunkContent);
          setCurrentChunkContent("");
          setCurrentChunkType(null);
        }
      }, [
        curChatEnd,
        currentChunkContent,
        currentChunkType,
        handleChunkContent,
      ]);

      const assistantMessage = useMemo(() => {
        if (!activeChat?._id || (!curMessage && !messages)) return null;
        return {
          _id: activeChat._id,
          _source: {
            type: "assistant",
            message: curMessage || messages,
          },
        };
      }, [activeChat?._id, curMessage, messages]);

      const updatedChat = useMemo(() => {
        if (!activeChat?._id || !assistantMessage) return null;
        return {
          ...activeChat,
          messages: [...(activeChat.messages || []), assistantMessage],
        };
      }, [activeChat, assistantMessage]);

      const simulateAssistantResponse = useCallback(() => {
        if (!updatedChat) return;

        console.log("updatedChat:", updatedChat);
        setActiveChat(updatedChat);
        setMessages("");
        setCurMessage("");
        setIsTyping(false);
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
      }, [activeChat?.messages, isTyping, curMessage]);

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
          sourceContentRef.current = [];
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
            setIsTyping(true);
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

      const handleSendMessage = useCallback(
        async (content: string, newChat?: Chat) => {
          newChat = newChat || activeChat;
          if (!newChat?._id || !content) return;
          setTimedoutShow(false);
          setErrorShow(false);
          sourceContentRef.current = [];
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
            setIsTyping(true);
            setCurChatEnd(false);
          } catch (error) {
            setErrorShow(true);
            console.error("Failed to fetch user data:", error);
          }
        },
        [activeChat, isSearchActive, isDeepThinkActive]
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
        if (curMessage || messages) {
          simulateAssistantResponse();
        }

        setCurChatEnd(true);
        setIsTyping(false);
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
          setMessages("");
          setCurMessage("");
          setActiveChat(undefined);
          setIsTyping(false);
          setCurChatEnd(true);
          scrollToBottom.cancel();
        };
      }, []);

      const chatHistory = async (chat: Chat) => {
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
          setActiveChat(updatedChat);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };

      const onSelectChat = async (chat: any) => {
        chatClose();
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
          />

          {/* Chat messages */}
          <div className="w-full overflow-x-hidden overflow-y-auto border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.15)] custom-scrollbar relative">
            <ChatMessage
              key={"greetings"}
              message={{
                _id: "greetings",
                _source: {
                  type: "assistant",
                  message: t("assistant.chat.greetings"),
                },
              }}
              isTyping={false}
            />

            {activeChat?.messages?.map((message, index) => (
              <ChatMessage
                key={message._id + index}
                message={message}
                isTyping={
                  isTyping &&
                  index === (activeChat.messages?.length || 0) - 1 &&
                  message._source?.type === "assistant"
                }
              />
            ))}

            {!curChatEnd && activeChat?._id ? (
              <ChatMessage
                key={"last"}
                message={{
                  _id: activeChat?._id,
                  _source: {
                    type: "assistant",
                    message: curMessage,
                  },
                }}
                isTyping={!curChatEnd}
                isThinkTyping={showThinkTyping}
              />
            ) : null}

            {/* {!curChatEnd && activeChat?._id ? (
              <>
                <QueryIntent query_intent={query_intent} />
              </>
            ) : null} */}

            {timedoutShow ? (
              <ChatMessage
                key={"timedout"}
                message={{
                  _id: "timedout",
                  _source: {
                    type: "assistant",
                    message: t("assistant.chat.timedout"),
                  },
                }}
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
                  },
                }}
                isTyping={false}
              />
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        </div>
      );
    }
  )
);

export default ChatAI;
