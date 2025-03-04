import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import { Sidebar } from "@/components/Assistant/Sidebar";
import type { Chat } from "@/components/Assistant/types";
import { useConnectStore } from "@/stores/connectStore";
import InputBox from "@/components/Search/InputBox";

interface ChatProps {}

export default function Chat({}: ChatProps) {
  const currentService = useConnectStore((state) => state.currentService);

  const chatAIRef = useRef<ChatAIRef>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isTyping = false;

  const [input, setInput] = useState("");

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);

  const isChatPage = true

  useEffect(() => {
    getChatHistory();
  }, []);

  const getChatHistory = async () => {
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
    setInput(content);
    chatAIRef.current?.init(content);
  };

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

  const cancelChat = async () => {
    chatAIRef.current?.cancelChat();
  };

  const clearChat = () => {
    chatClose();
    setActiveChat(undefined);
  };

  const reconnect = () => {
    chatAIRef.current?.reconnect();
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
            <Sidebar
              chats={chats}
              activeChat={activeChat}
              onNewChat={() => {
                chatAIRef.current?.clearChat();
              }}
              onSelectChat={onSelectChat}
              onDeleteChat={deleteChat}
            />
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
            clearChatPage={clearChat}
            isChatPage={isChatPage}
          />

          {/* Input area */}
          <div className={`border-t p-4 border-gray-200 dark:border-gray-800`}>
            <InputBox
              isChatMode={true}
              inputValue={input}
              onSend={handleSendMessage}
              changeInput={setInput}
              disabled={isTyping}
              disabledChange={cancelChat}
              reconnect={reconnect}
              isSearchActive={isSearchActive}
              setIsSearchActive={() => setIsSearchActive((prev) => !prev)}
              isDeepThinkActive={isDeepThinkActive}
              setIsDeepThinkActive={() => setIsDeepThinkActive((prev) => !prev)}
              isChatPage={isChatPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
