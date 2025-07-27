import { MessageSquarePlus } from "lucide-react";
import clsx from "clsx";

import HistoryIcon from "@/icons/History";
import PinOffIcon from "@/icons/PinOff";
import PinIcon from "@/icons/Pin";
import WindowsFullIcon from "@/icons/WindowsFull";
import { useAppStore } from "@/stores/appStore";
import type { Chat } from "@/types/chat";
import platformAdapter from "@/utils/platformAdapter";
import VisibleKey from "../Common/VisibleKey";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { HISTORY_PANEL_ID } from "@/constants";
import { AssistantList } from "./AssistantList";
import { ServerList } from "./ServerList";
import { toggle_move_to_active_space_attribute } from "@/commands/system";

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
  const { isPinned, setIsPinned, isTauri } = useAppStore();

  const { historicalRecords, newSession, fixedWindow, external } =
    useShortcutsStore();

  const togglePin = async () => {
    try {
      const newPinned = !isPinned;
      await platformAdapter.setAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
      toggle_move_to_active_space_attribute();
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
    }
  };

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

        {showChatHistory ? (
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
        ) : null}
      </div>

      <h2 className="max-w-[calc(100%-200px)] text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
        {activeChat?._source?.title ||
          activeChat?._source?.message ||
          activeChat?._id}
      </h2>

      {isTauri ? (
        <div className="flex items-center gap-2">
          <button
            onClick={togglePin}
            className={clsx("inline-flex", {
              "text-blue-500": isPinned,
            })}
          >
            <VisibleKey shortcut={fixedWindow} onKeyPress={togglePin}>
              {isPinned ? <PinIcon /> : <PinOffIcon />}
            </VisibleKey>
          </button>

          <ServerList clearChat={clearChat} />

          {isChatPage ? null : (
            <button className="inline-flex" onClick={onOpenChatAI}>
              <VisibleKey shortcut={external} onKeyPress={onOpenChatAI}>
                <WindowsFullIcon className="rotate-30 scale-x-[-1]" />
              </VisibleKey>
            </button>
          )}
        </div>
      ) : (
        <div />
      )}
    </header>
  );
}
