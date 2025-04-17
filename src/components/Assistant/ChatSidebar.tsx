import React from "react";

// import { Sidebar } from "@/components/Assistant/Sidebar";
import type { Chat } from "./types";
import HistoryList from "../Common/HistoryList";

interface ChatSidebarProps {
  isSidebarOpen: boolean;
  chats: Chat[];
  activeChat?: Chat;
  // onNewChat: () => void;
  onSelectChat: (chat: any) => void;
  onDeleteChat: (chatId: string) => void;
  fetchChatHistory: () => void;
  onSearch: (keyword: string) => void;
  onRename: (chat: any, title: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isSidebarOpen,
  chats,
  activeChat,
  // onNewChat,
  onSelectChat,
  onDeleteChat,
  fetchChatHistory,
  onSearch,
  onRename,
}) => {
  return (
    <div
      data-sidebar
      className={`
        h-[calc(100%+90px)] absolute top-0 left-0 z-10 w-64 
        transform transition-all duration-300 ease-in-out 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        bg-gray-100 dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700 rounded-tl-xl rounded-bl-xl
        overflow-hidden
      `}
    >
      {isSidebarOpen && (
        <HistoryList
          list={chats}
          active={activeChat}
          onSearch={onSearch}
          onRefresh={fetchChatHistory}
          onSelect={onSelectChat}
          onRename={onRename}
          onRemove={onDeleteChat}
        />
      )}
      {/* <Sidebar
        chats={chats}
        activeChat={activeChat}
        onNewChat={onNewChat}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        fetchChatHistory={fetchChatHistory}
      /> */}
    </div>
  );
};
