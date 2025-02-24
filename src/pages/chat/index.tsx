import { useState, useRef, useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";

import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import { ChatInput } from "@/components/Assistant/ChatInput";
import { Sidebar } from "@/components/Assistant/Sidebar";
import type { Chat } from "@/components/Assistant/types";
import { tauriFetch } from "@/api/tauriFetchClient";
import { useWindows }  from "@/hooks/useWindows";
import ApiDetails from "@/components/Common/ApiDetails";

interface ChatProps {}

export default function Chat({}: ChatProps) {
  const { closeWin } = useWindows();

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
      const response = await tauriFetch({
        url: "/chat/_history",
        method: "GET",
      });
      console.log("_history", response);
      const hits = response.data?.hits?.hits || [];
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
      const response = await tauriFetch({
        url: `/chat/${chat._id}/_history`,
        method: "GET",
      });
      console.log("id_history", response);
      const hits = response.data?.hits?.hits || [];
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
      const response = await tauriFetch({
        url: `/chat/${activeChat._id}/_close`,
        method: "POST",
      });
      console.log("_close", response);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const onSelectChat = async (chat: any) => {
    chatClose();
    try {
      const response = await tauriFetch({
        url: `/chat/${chat._id}/_open`,
        method: "POST",
      });
      console.log("_open", response);
      chatHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const cancelChat = async () => {
    if (!activeChat?._id) return;
    try {
      const response = await tauriFetch({
        url: `/chat/${activeChat._id}/_cancel`,
        method: "POST",
      });
      console.log("_cancel", response);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  async function closeWindow() {
    if (isTauri() && closeWin) {
      await closeWin("chat");
    }
  }

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
