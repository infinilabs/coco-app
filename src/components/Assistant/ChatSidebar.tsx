import React from "react";

import type { Chat } from "@/types/chat";
import HistoryList from "../Common/HistoryList";
import { HISTORY_PANEL_ID } from "@/constants";

interface ChatSidebarProps {
  isSidebarOpen: boolean;
  chats: Chat[];
  activeChat?: Chat;
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
        h-screen fixed top-0 left-0 z-100 w-64
        transform transition-all duration-300 ease-in-out 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        bg-gray-100 dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700 rounded-tl-xl rounded-bl-xl
        overflow-hidden
      `}
    >
      {isSidebarOpen && (
        <HistoryList
          id={HISTORY_PANEL_ID}
          list={chats}
          active={activeChat}
          onSearch={onSearch}
          onRefresh={fetchChatHistory}
          onSelect={onSelectChat}
          onRename={onRename}
          onRemove={onDeleteChat}
        />
      )}
    </div>
  );
};
