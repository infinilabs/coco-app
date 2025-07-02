import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { useChatStore } from "@/stores/chatStore";
import { useConnectStore } from "@/stores/connectStore";
import { useWindows } from "@/hooks/useWindows";
import useMessageChunkData from "@/hooks/useMessageChunkData";
import useWebSocket from "@/hooks/useWebSocket";
import { useChatActions } from "@/hooks/useChatActions";
import { useMessageHandler } from "@/hooks/useMessageHandler";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatContent } from "./ChatContent";
import ConnectPrompt from "./ConnectPrompt";
import type { Chat, StartPage } from "@/types/chat";
import PrevSuggestion from "@/components/ChatMessage/PrevSuggestion";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
// import ReadAloud from "./ReadAloud";
import { useAuthStore } from "@/stores/authStore";
import Splash from "./Splash";

interface ChatAIProps {
  isSearchActive?: boolean;
  isDeepThinkActive?: boolean;
  isMCPActive?: boolean;
  activeChatProp?: Chat;
  changeInput?: (val: string) => void;
  setIsSidebarOpen?: (value: boolean) => void;
  isSidebarOpen?: boolean;
  clearChatPage?: () => void;
  isChatPage?: boolean;
  getFileUrl: (path: string) => string;
  showChatHistory?: boolean;
  assistantIDs?: string[];
  startPage?: StartPage;
}

export interface ChatAIRef {
  init: (value: string) => void;
  cancelChat: () => void;
  clearChat: () => void;
}

const ChatAI = memo(
  forwardRef<ChatAIRef, ChatAIProps>(
    (
      {
        changeInput,
        isSearchActive,
        isDeepThinkActive,
        isMCPActive,
        activeChatProp,
        setIsSidebarOpen,
        isSidebarOpen = false,
        clearChatPage,
        isChatPage = false,
        getFileUrl,
        showChatHistory,
        assistantIDs,
        startPage,
      },
      ref
    ) => {
      useImperativeHandle(ref, () => ({
        init: init,
        cancelChat: () => cancelChat(activeChat),
        clearChat: clearChat,
      }));

      const { curChatEnd, setCurChatEnd } =
        useChatStore();

      const isTauri = useAppStore((state) => state.isTauri);

      const isCurrentLogin = useAuthStore((state) => state.isCurrentLogin);
      const setIsCurrentLogin = useAuthStore((state) => {
        return state.setIsCurrentLogin;
      });

      const visibleStartPage = useConnectStore((state) => {
        return state.visibleStartPage;
      });

      const addError = useAppStore.getState().addError;

      const [activeChat, setActiveChat] = useState<Chat>();
      const [timedoutShow, setTimedoutShow] = useState(false);

      const curIdRef = useRef("");

      const [isSidebarOpenChat, setIsSidebarOpenChat] = useState(isSidebarOpen);
      const [chats, setChats] = useState<Chat[]>([]);
      const askAiSessionId = useSearchStore((state) => state.askAiSessionId);
      const setAskAiSessionId = useSearchStore(
        (state) => state.setAskAiSessionId
      );
      const askAiServerId = useSearchStore((state) => {
        return state.askAiServerId;
      });
      const currentService = useConnectStore((state) => {
        return state.currentService;
      });

      useEffect(() => {
        activeChatProp && setActiveChat(activeChatProp);
      }, [activeChatProp]);

      useEffect(() => {
        if (!isTauri) return;

        if (!currentService?.enabled) {
          setActiveChat(void 0);
          setIsCurrentLogin(false);
        }

        if (showChatHistory) {
          getChatHistory();
        }
      }, [currentService?.enabled, showChatHistory]);

      useEffect(() => {
        if (askAiServerId || !askAiSessionId) return;

        onSelectChat({ _id: askAiSessionId });

        setAskAiSessionId(void 0);
      }, [askAiSessionId, askAiServerId]);

      const [Question, setQuestion] = useState<string>("");

      const [websocketSessionId, setWebsocketSessionId] = useState("");

      const onWebsocketSessionId = useCallback((sessionId: string) => {
        setWebsocketSessionId(sessionId);
      }, []);

      const {
        data: {
          query_intent,
          tools,
          fetch_source,
          pick_source,
          deep_read,
          think,
          response,
        },
        handlers,
        clearAllChunkData,
      } = useMessageChunkData();

      const [loadingStep, setLoadingStep] = useState<Record<string, boolean>>({
        query_intent: false,
        tools: false,
        fetch_source: false,
        pick_source: false,
        deep_read: false,
        think: false,
        response: false,
      });

      const dealMsgRef = useRef<((msg: string) => void) | null>(null);

      const clientId = isChatPage ? "standalone" : "popup";
      const { updateDealMsg } = useWebSocket({
        clientId,
        dealMsgRef,
        onWebsocketSessionId,
      });

      const {
        chatClose,
        cancelChat,
        chatHistory,
        createNewChat,
        handleSendMessage,
        openSessionChat,
        getChatHistory,
        createChatWindow,
        handleSearch,
        handleRename,
        handleDelete,
      } = useChatActions(
        setActiveChat,
        setCurChatEnd,
        setTimedoutShow,
        clearAllChunkData,
        setQuestion,
        curIdRef,
        setChats,
        isSearchActive,
        isDeepThinkActive,
        isMCPActive,
        changeInput,
        websocketSessionId,
        showChatHistory
      );

      const { dealMsg } = useMessageHandler(
        curIdRef,
        setCurChatEnd,
        setTimedoutShow,
        (chat) => cancelChat(chat || activeChat),
        setLoadingStep,
        handlers
      );

      useEffect(() => {
        if (dealMsg) {
          dealMsgRef.current = dealMsg;
          updateDealMsg && updateDealMsg(dealMsg);
        }
      }, [dealMsg, updateDealMsg]);

      const clearChat = useCallback(() => {
        //console.log("clearChat");
        setTimedoutShow(false);
        chatClose(activeChat);
        setActiveChat(undefined);
        setCurChatEnd(true);
        clearChatPage && clearChatPage();
      }, [activeChat, chatClose]);

      const init = useCallback(
        async (value: string) => {
          try {
            //console.log("init", curChatEnd, activeChat?._id);
            if (!isCurrentLogin) {
              addError("Please login to continue chatting");
              return;
            }
            if (!curChatEnd) {
              addError("Please wait for the current conversation to complete");
              return;
            }
            if (!activeChat?._id) {
              await createNewChat(value, activeChat);
            } else {
              await handleSendMessage(value, activeChat);
            }
          } catch (error) {
            console.error("Failed to initialize chat:", error);
          }
        },
        [
          isCurrentLogin,
          curChatEnd,
          activeChat?._id,
          createNewChat,
          handleSendMessage,
        ]
      );

      const { createWin } = useWindows();
      const openChatAI = useCallback(() => {
        createChatWindow(createWin);
      }, [createChatWindow, createWin]);

      const onSelectChat = useCallback(
        async (chat: Chat) => {
          setTimedoutShow(false);
          clearAllChunkData();
          await cancelChat(activeChat);
          await chatClose(activeChat);
          const response = await openSessionChat(chat);
          if (response) {
            chatHistory(response);
          }
        },
        [cancelChat, activeChat, chatClose, openSessionChat, chatHistory]
      );

      const deleteChat = useCallback(
        (chatId: string) => {
          handleDelete(chatId);

          setChats((prev) => {
            const updatedChats = prev.filter((chat) => chat._id !== chatId);

            if (activeChat?._id === chatId) {
              if (updatedChats.length > 0) {
                setActiveChat(updatedChats[0]);
              } else {
                init("");
              }
            }

            return updatedChats;
          });
        },
        [activeChat?._id, handleDelete, init]
      );

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

      const toggleSidebar = useCallback(() => {
        setIsSidebarOpenChat(!isSidebarOpenChat);
        setIsSidebarOpen && setIsSidebarOpen(!isSidebarOpenChat);
        !isSidebarOpenChat && getChatHistory();
      }, [isSidebarOpenChat, setIsSidebarOpen, getChatHistory]);

      const renameChat = useCallback(
        (chatId: string, title: string) => {
          setChats((prev) => {
            const chatIndex = prev.findIndex((chat) => chat._id === chatId);

            if (chatIndex === -1) return prev;

            const modifiedChat = {
              ...prev[chatIndex],
              _source: { ...prev[chatIndex]._source, title },
            };

            const result = [...prev];
            result.splice(chatIndex, 1, modifiedChat);
            return result;
          });

          if (activeChat?._id === chatId) {
            setActiveChat((prev) => {
              if (!prev) return prev;
              return { ...prev, _source: { ...prev._source, title } };
            });
          }

          handleRename(chatId, title);
        },
        [activeChat?._id, handleRename]
      );

      return (
        <>
          {showChatHistory && !setIsSidebarOpen && (
            <ChatSidebar
              isSidebarOpen={isSidebarOpenChat}
              chats={chats}
              activeChat={activeChat}
              onSelectChat={onSelectChat}
              onDeleteChat={deleteChat}
              fetchChatHistory={getChatHistory}
              onSearch={handleSearch}
              onRename={renameChat}
            />
          )}
          <div
            data-tauri-drag-region
            className={`flex flex-col rounded-md h-full overflow-hidden relative`}
          >
            <ChatHeader
              clearChat={clearChat}
              onOpenChatAI={openChatAI}
              setIsSidebarOpen={toggleSidebar}
              isSidebarOpen={isSidebarOpenChat}
              activeChat={activeChat}
              isChatPage={isChatPage}
              showChatHistory={showChatHistory}
              assistantIDs={assistantIDs}
            />

            {isCurrentLogin ? (
              <>
                <ChatContent
                  activeChat={activeChat}
                  curChatEnd={curChatEnd}
                  query_intent={query_intent}
                  tools={tools}
                  fetch_source={fetch_source}
                  pick_source={pick_source}
                  deep_read={deep_read}
                  think={think}
                  response={response}
                  loadingStep={loadingStep}
                  timedoutShow={timedoutShow}
                  Question={Question}
                  handleSendMessage={(value) =>
                    handleSendMessage(value, activeChat)
                  }
                  getFileUrl={getFileUrl}
                />
                <Splash assistantIDs={assistantIDs} startPage={startPage} />
              </>
            ) : (
              <ConnectPrompt />
            )}

            {!activeChat?._id && !visibleStartPage && (
              <PrevSuggestion sendMessage={init} />
            )}

            {/* <ReadAloud /> */}
          </div>
        </>
      );
    }
  )
);

export default ChatAI;
