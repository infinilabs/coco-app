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
import { useSearchStore } from "@/stores/searchStore";
import { useWindows } from "@/hooks/useWindows";
import useMessageChunkData from "@/hooks/useMessageChunkData";
import useWebSocket from "@/hooks/useWebSocket";
import { useChatActions } from "@/hooks/useChatActions";
import { useMessageHandler } from "@/hooks/useMessageHandler";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatContent } from "./ChatContent";
import ConnectPrompt from "./ConnectPrompt";
import type { Chat } from "./types";
import PrevSuggestion from "@/components/ChatMessage/PrevSuggestion";

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
  getFileUrl: (path: string) => string;
  showChatHistory?: boolean;
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
        getFileUrl,
        showChatHistory,
      },
      ref
    ) => {
      if (!isTransitioned) return null;

      useImperativeHandle(ref, () => ({
        init: init,
        cancelChat: () => cancelChat(activeChat),
        reconnect: reconnect,
        clearChat: clearChat,
      }));

      const { curChatEnd, setCurChatEnd, connected, setConnected } =
        useChatStore();

      const currentService = useConnectStore((state) => state.currentService);

      const [activeChat, setActiveChat] = useState<Chat>();
      const [timedoutShow, setTimedoutShow] = useState(false);
      const [isLogin, setIsLogin] = useState(true);

      const curIdRef = useRef("");

      const [isSidebarOpenChat, setIsSidebarOpenChat] = useState(isSidebarOpen);
      const [chats, setChats] = useState<Chat[]>([]);
      const sourceDataIds = useSearchStore((state) => state.sourceDataIds);

      useEffect(() => {
        activeChatProp && setActiveChat(activeChatProp);
      }, [activeChatProp]);

      const [Question, setQuestion] = useState<string>("");

      const [showPrevSuggestion, setShowPrevSuggestion] = useState(true);

      const [websocketSessionId, setWebsocketSessionId] = useState("");

      const onWebsocketSessionId = useCallback((sessionId: string) => {
        setWebsocketSessionId(sessionId);
      }, []);

      const {
        data: {
          query_intent,
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
        fetch_source: false,
        pick_source: false,
        deep_read: false,
        think: false,
        response: false,
      });

      const dealMsgRef = useRef<((msg: string) => void) | null>(null);

      const clientId = isChatPage ? "standalone" : "popup";
      const {
        errorShow,
        setErrorShow,
        reconnect,
        disconnectWS,
        updateDealMsg,
      } = useWebSocket({
        clientId,
        connected,
        setConnected,
        currentService,
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
        currentService?.id,
        setActiveChat,
        setCurChatEnd,
        setErrorShow,
        setTimedoutShow,
        clearAllChunkData,
        setQuestion,
        curIdRef,
        setChats,
        isSearchActive,
        isDeepThinkActive,
        sourceDataIds,
        changeInput,
        websocketSessionId,
        showChatHistory
      );

      const { dealMsg, messageTimeoutRef } = useMessageHandler(
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
        console.log("clearChat");
        setTimedoutShow(false);
        setErrorShow(false);
        chatClose(activeChat);
        setActiveChat(undefined);
        setCurChatEnd(true);
        clearChatPage && clearChatPage();
      }, [
        activeChat,
        chatClose,
        clearChatPage,
        setCurChatEnd,
        setErrorShow,
        setTimedoutShow,
      ]);

      const init = useCallback(
        async (value: string) => {
          try {
            console.log("init", isLogin, curChatEnd, activeChat?._id);
            if (!isLogin || !curChatEnd) return;
            setShowPrevSuggestion(false);
            if (!activeChat?._id) {
              await createNewChat(value, activeChat, websocketSessionId);
            } else {
              await handleSendMessage(value, activeChat, websocketSessionId);
            }
          } catch (error) {
            console.error("Failed to initialize chat:", error);
          }
        },
        [
          isLogin,
          curChatEnd,
          activeChat,
          createNewChat,
          handleSendMessage,
          websocketSessionId,
        ]
      );

      const { createWin } = useWindows();
      const openChatAI = useCallback(() => {
        createChatWindow(createWin);
      }, [createChatWindow, createWin]);

      useEffect(() => {
        setCurChatEnd(true);
        return () => {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }
          Promise.resolve().then(() => {
            chatClose(activeChat);
            setActiveChat(undefined);
            setCurChatEnd(true);
            disconnectWS();
          });
        };
      }, [chatClose, setCurChatEnd]);

      const onSelectChat = useCallback(
        async (chat: Chat) => {
          setTimedoutShow(false);
          setErrorShow(false);
          clearAllChunkData();
          await cancelChat(activeChat);
          await chatClose(activeChat);
          const response = await openSessionChat(chat);
          if (response) {
            chatHistory(response);
          }
        },
        [
          clearAllChunkData,
          cancelChat,
          activeChat,
          chatClose,
          openSessionChat,
          chatHistory,
        ]
      );

      const deleteChat = useCallback(
        (chatId: string) => {
          handleDelete(chatId);

          setChats((prev) => prev.filter((chat) => chat._id !== chatId));

          if (activeChat?._id === chatId) {
            const remainingChats = chats.filter((chat) => chat._id !== chatId);

            if (remainingChats.length > 0) {
              setActiveChat(remainingChats[0]);
            } else {
              init("");
            }
          }
        },
        [activeChat, chats, init, setActiveChat]
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

      // const fetchChatHistory = useCallback(async () => {
      //   const hits = await getChatHistory();
      //   setChats(hits);
      // }, [getChatHistory]);

      const setIsLoginChat = useCallback(
        (value: boolean) => {
          setIsLogin(value);
          value && currentService && !setIsSidebarOpen && getChatHistory();
          !value && setChats([]);
        },
        [currentService, setIsSidebarOpen, getChatHistory]
      );

      const toggleSidebar = useCallback(() => {
        setIsSidebarOpenChat(!isSidebarOpenChat);
        setIsSidebarOpen && setIsSidebarOpen(!isSidebarOpenChat);
        !isSidebarOpenChat && getChatHistory();
      }, [isSidebarOpenChat, setIsSidebarOpen, getChatHistory]);

      return (
        <div
          data-tauri-drag-region
          className={`h-full flex flex-col rounded-xl relative`}
        >
          {showChatHistory && !setIsSidebarOpen && (
            <ChatSidebar
              isSidebarOpen={isSidebarOpenChat}
              chats={chats}
              activeChat={activeChat}
              // onNewChat={clearChat}
              onSelectChat={onSelectChat}
              onDeleteChat={deleteChat}
              fetchChatHistory={getChatHistory}
              onSearch={handleSearch}
              onRename={handleRename}
            />
          )}

          <ChatHeader
            onCreateNewChat={clearChat}
            onOpenChatAI={openChatAI}
            setIsSidebarOpen={toggleSidebar}
            isSidebarOpen={isSidebarOpenChat}
            activeChat={activeChat}
            reconnect={reconnect}
            isChatPage={isChatPage}
            setIsLogin={setIsLoginChat}
            showChatHistory={showChatHistory}
          />
          {isLogin ? (
            <ChatContent
              activeChat={activeChat}
              curChatEnd={curChatEnd}
              query_intent={query_intent}
              fetch_source={fetch_source}
              pick_source={pick_source}
              deep_read={deep_read}
              think={think}
              response={response}
              loadingStep={loadingStep}
              timedoutShow={timedoutShow}
              errorShow={errorShow}
              Question={Question}
              handleSendMessage={(value) =>
                handleSendMessage(value, activeChat)
              }
              getFileUrl={getFileUrl}
            />
          ) : (
            <ConnectPrompt />
          )}

          {showPrevSuggestion ? <PrevSuggestion sendMessage={init} /> : null}
        </div>
      );
    }
  )
);

export default ChatAI;
