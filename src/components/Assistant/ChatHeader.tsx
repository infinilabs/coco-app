import { MessageSquarePlus } from "lucide-react";

import HistoryIcon from "@/icons/History";
import WindowsFullIcon from "@/icons/WindowsFull";
import { useAppStore } from "@/stores/appStore";
import type { Chat } from "@/types/chat";
import VisibleKey from "../Common/VisibleKey";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { HISTORY_PANEL_ID } from "@/constants";
import { AssistantList } from "./AssistantList";
import { ServerList } from "./ServerList";
import TogglePin from "../Common/TogglePin";
import WebLogin from "../WebLogin";

interface ChatHeaderProps {
  clearChat: () => void;
  onOpenChatAI: () => void;
  setIsSidebarOpen: () => void;
  isSidebarOpen: boolean;
  activeChat: Chat | undefined;
  isChatPage?: boolean;
  showChatHistory?: boolean;
  assistantIDs?: string[];
}

export function ChatHeader({
  clearChat,
  onOpenChatAI,
  isSidebarOpen,
  setIsSidebarOpen,
  activeChat,
  isChatPage = false,
  showChatHistory = true,
  assistantIDs,
}: ChatHeaderProps) {
  const { isTauri } = useAppStore();

  const { historicalRecords, newSession, external } = useShortcutsStore();

  return (
    <header
      className="flex items-center justify-between py-2 px-3 select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">
        {showChatHistory && (
          <button
            data-sidebar-button
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen();
            }}
            aria-controls={isSidebarOpen ? HISTORY_PANEL_ID : void 0}
            className="py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <VisibleKey
              shortcut={historicalRecords}
              onKeyPress={setIsSidebarOpen}
            >
              <HistoryIcon className="h-4 w-4" />
            </VisibleKey>
          </button>
        )}

        <AssistantList assistantIDs={assistantIDs} />

        {showChatHistory && (
          <button
            onClick={clearChat}
            className="p-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <VisibleKey
              shortcutClassName="top-2.5"
              shortcut={newSession}
              onKeyPress={clearChat}
            >
              <MessageSquarePlus className="h-4 w-4 relative top-0.5" />
            </VisibleKey>
          </button>
        )}
      </div>

      <h2 className="max-w-[calc(100%-200px)] text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
        {activeChat?._source?.title ||
          activeChat?._source?.message ||
          activeChat?._id}
      </h2>

      {isTauri ? (
        <div className="flex items-center gap-2">
          <TogglePin className="inline-flex" />

          <ServerList clearChat={clearChat} />

          {isChatPage ? null : (
            <button className="inline-flex" onClick={onOpenChatAI}>
              <VisibleKey shortcut={external} onKeyPress={onOpenChatAI}>
                <WindowsFullIcon className="scale-x-[-1]" />
              </VisibleKey>
            </button>
          )}
        </div>
      ) : (
        <WebLogin panelClassName="top-8 right-0" />
      )}
    </header>
  );
}
