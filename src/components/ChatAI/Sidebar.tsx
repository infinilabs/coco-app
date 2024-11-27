import { MessageSquare, Plus } from "lucide-react";
import type { Chat } from "./types";
import { useTheme } from "../ThemeProvider";

interface SidebarProps {
  chats: Chat[];
  activeChat: Chat;
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  className?: string;
}

export function Sidebar({
  chats,
  activeChat,
  onNewChat,
  onSelectChat,
  className = "",
}: SidebarProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="p-4">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-all ${
            isDark
              ? " text-white hover:bg-gray-600 active:bg-gray-500"
              : " text-gray-700 hover:bg-gray-50 active:bg-gray-100 shadow-sm"
          }`}
        >
          <Plus
            className={`h-4 w-4 ${
              isDark ? "text-indigo-400" : "text-indigo-600"
            }`}
          />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar">
        {chats.map((chat) => (
          <div
            key={chat._id}
            className={`group relative rounded-lg transition-all ${
              activeChat._id === chat._id
                ? isDark
                  ? " text-white"
                  : " text-gray-900 shadow-sm"
                : isDark
                ? "text-gray-300 hover:bg-gray-700/30"
                : "text-gray-600 hover:bg-white/10"
            }`}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left"
              onClick={() => onSelectChat(chat)}
            >
              <MessageSquare
                className={`h-4 w-4 flex-shrink-0 ${
                  activeChat._id === chat._id
                    ? isDark
                      ? "text-indigo-400"
                      : "text-indigo-600"
                    : isDark
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              />
              <span className="truncate">{chat.title || chat._id}</span>
            </button>
            {/* {chats.length > 1 && (
              <button
                onClick={() => onDeleteChat(chat._id)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-all ${
                  isDark
                    ? "hover:bg-gray-600 text-gray-400 hover:text-red-400"
                    : "hover:bg-gray-100 text-gray-500 hover:text-red-500"
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )} */}
            {activeChat._id === chat._id && (
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full ${
                  isDark ? "bg-indigo-400" : "bg-indigo-600"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
