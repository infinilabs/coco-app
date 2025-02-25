import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import { ChatInput } from "@/components/Assistant/ChatInput";
import { Sidebar } from "@/components/Assistant/Sidebar";
import type { Chat } from "@/components/Assistant/types";
import ApiDetails from "@/components/Common/ApiDetails";
import { useAppStore } from "@/stores/appStore";

interface ChatProps {}

export default function Chat({}: ChatProps) {
  const activeServer = useAppStore((state) => state.activeServer);


  const chatAIRef = useRef<ChatAIRef>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const [curChatEnd, setCurChatEnd] = useState(true);

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);

  useEffect(() => {
    getChatHistory();
  }, []);

  const getChatHistory = async () => {
    try {
      let response: any = await invoke("chat_history", {
        serverId: activeServer?.id,
      });
      response = JSON.parse(response || "")
      console.log("_history", response);
      const hits = response?.hits?.hits || [];
      setChats(hits);
      if (hits[0]) {
        onSelectChat(hits[0]);
      } else {
        chatAIRef.current?.init("");
      }
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
        chatAIRef.current?.init("");
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    chatAIRef.current?.handleSendMessage(content);
  };

  const chatHistory = async (chat: Chat) => {
    try {
      let response: any = await invoke("session_chat_history", {
        serverId: activeServer?.id,
        sessionId: chat?._id,
        from: 0,
        size: 20,
      });
      response = JSON.parse(response || "")
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

  const chatClose = async () => {
    if (!activeChat?._id) return;
    try {
      let response: any = await invoke("close_session_chat", {
        serverId: activeServer?.id,
        sessionId: activeChat?._id,
      });
      response = JSON.parse(response || "")
      console.log("_close", response);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const onSelectChat = async (chat: any) => {
    chatClose();
    try {
      let response: any = await invoke("open_session_chat", {
        serverId: activeServer?.id,
        sessionId: chat?._id,
      });
      response = JSON.parse(response || "")
      console.log("_open", response);
      chatHistory(response);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const cancelChat = async () => {
    if (!activeChat?._id) return;
    try {
      let response: any = await invoke("cancel_session_chat", {
        serverId: activeServer?.id,
        sessionId: activeChat?._id,
      });
      response = JSON.parse(response || "")
      console.log("_cancel", response);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  return (
    <div className="h-screen">
      <div className="h-[100%] flex">
        {/* Sidebar */}
        {isSidebarOpen ? (
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block bg-gray-100 dark:bg-gray-800`}
          >
            {activeChat ? (
              <Sidebar
                chats={chats}
                activeChat={activeChat}
                onNewChat={() => chatAIRef.current?.init("")}
                onSelectChat={onSelectChat}
                onDeleteChat={deleteChat}
              />
            ) : null}
          </div>
        ) : null}

        {/* Main content */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900`}>

          {/* Chat messages */}
          <ChatAI
            ref={chatAIRef}
            key="ChatAI"
            activeChatProp={activeChat}
            isTransitioned={true}
            isSearchActive={isSearchActive}
            isDeepThinkActive={isDeepThinkActive}
            setIsSidebarOpen={setIsSidebarOpen}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Input area */}
          <div className={`border-t p-4 border-gray-200 dark:border-gray-800`}>
            <ChatInput
              onSend={handleSendMessage}
              disabled={isTyping}
              curChatEnd={curChatEnd}
              disabledChange={() => {
                cancelChat();
                setCurChatEnd(true);
                setIsTyping(false);
              }}
              isSearchActive={isSearchActive}
              setIsSearchActive={() => setIsSearchActive((prev) => !prev)}
              isDeepThinkActive={isDeepThinkActive}
              setIsDeepThinkActive={() => setIsDeepThinkActive((prev) => !prev)}
            />
          </div>
        </div>
      </div>

      <ApiDetails/>
    </div>
  );
}
