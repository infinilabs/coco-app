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

      const { errorShow, setErrorShow, reconnect, updateDealMsg } =
        useWebSocket({
          connected,
          setConnected,
          currentService,
          dealMsgRef,
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
      } = useChatActions(
        currentService?.id,
        setActiveChat,
        setCurChatEnd,
        setErrorShow,
        setTimedoutShow,
        clearAllChunkData,
        setQuestion,
        curIdRef,
        isSearchActive,
        isDeepThinkActive,
        sourceDataIds,
        changeInput
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
        (value: string) => {
          if (!isLogin) return;
          if (!curChatEnd) return;
          if (!activeChat?._id) {
            createNewChat(value, activeChat);
          } else {
            handleSendMessage(value, activeChat);
          }
        },
        [isLogin, curChatEnd, activeChat, createNewChat, handleSendMessage]
      );

      const { createWin } = useWindows();
      const openChatAI = useCallback(() => {
        createChatWindow(createWin);
      }, [createChatWindow, createWin]);

      useEffect(() => {
        return () => {
          if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
          }
          chatClose(activeChat);
          setActiveChat(undefined);
          setCurChatEnd(true);
        };
      }, [chatClose, setCurChatEnd]);

      const onSelectChat = useCallback(
        async (chat: Chat) => {
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

      const deleteChat = useCallback((chatId: string) => {
        setChats((prev) => prev.filter((chat) => chat._id !== chatId));
        if (activeChat?._id === chatId) {
          const remainingChats = chats.filter((chat) => chat._id !== chatId);
          if (remainingChats.length > 0) {
            setActiveChat(remainingChats[0]);
          } else {
            init("");
          }
        }
      }, [activeChat, chats, init, setActiveChat]);

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

      const fetchChatHistory = useCallback(async () => {
        const hits = await getChatHistory();
        setChats(hits);
      }, [getChatHistory]);

      const setIsLoginChat = useCallback(
        (value: boolean) => {
          setIsLogin(value);
          value && currentService && !setIsSidebarOpen && fetchChatHistory();
          !value && setChats([]);
        },
        [currentService, setIsSidebarOpen, fetchChatHistory]
      );

      const toggleSidebar = useCallback(() => {
        setIsSidebarOpenChat(!isSidebarOpenChat);
        setIsSidebarOpen && setIsSidebarOpen(!isSidebarOpenChat);
        !isSidebarOpenChat && fetchChatHistory();
      }, [isSidebarOpenChat, setIsSidebarOpen, fetchChatHistory]);

      return (
        <div
          data-tauri-drag-region
          className={`h-full flex flex-col rounded-xl overflow-hidden`}
        >
          {!setIsSidebarOpen && (
            <ChatSidebar
              isSidebarOpen={isSidebarOpenChat}
              chats={chats}
              activeChat={activeChat}
              onNewChat={clearChat}
              onSelectChat={onSelectChat}
              onDeleteChat={deleteChat}
              fetchChatHistory={fetchChatHistory}
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
              handleSendMessage={handleSendMessage}
            />
          ) : (
            <ConnectPrompt />
          )}
        </div>
      );
    }
  )
);

export default ChatAI;
