import {
  MessageSquarePlus,
  ChevronDownIcon,
  Settings,
  RefreshCw,
  Check,
  Server,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import logoImg from "@/assets/icon.svg";
import HistoryIcon from "@/icons/History";
import PinOffIcon from "@/icons/PinOff";
import PinIcon from "@/icons/Pin";
import ServerIcon from "@/icons/Server";
import WindowsFullIcon from "@/icons/WindowsFull";
import { useAppStore, IServer } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import type { Chat } from "./types";
import { useConnectStore } from "@/stores/connectStore";

interface ChatHeaderProps {
  onCreateNewChat: () => void;
  onOpenChatAI: () => void;
  setIsSidebarOpen: () => void;
  isSidebarOpen: boolean;
  activeChat: Chat | undefined;
  reconnect: (server?: IServer) => void;
}

export function ChatHeader({
  onCreateNewChat,
  onOpenChatAI,
  setIsSidebarOpen,
  activeChat,
  reconnect,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const isPinned = useAppStore((state) => state.isPinned);
  const setIsPinned = useAppStore((state) => state.setIsPinned);

  const { connected, setConnected, setMessages } = useChatStore();

  const [serverList, setServerList] = useState<IServer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentService = useConnectStore((state) => state.currentService);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const fetchServers = async (resetSelection: boolean) => {
    invoke("list_coco_servers")
      .then((res: any) => {
        const enabledServers = (res as IServer[]).filter(
          (server) => server.enabled !== false
        );
        // console.log("list_coco_servers", enabledServers);
        setServerList(enabledServers);

        if (resetSelection && enabledServers.length > 0) {
          const currentServiceExists = enabledServers.some(
            server => server.id === currentService?.id
          );
          
          if (currentServiceExists) {
            switchServer(currentService);
          } else {
            switchServer(enabledServers[enabledServers.length - 1]);
          }
        }
      })
      .catch((err: any) => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchServers(true);

    return () => {
      // Cleanup logic if needed
      disconnect();
    };
  }, []);

  const disconnect = async () => {
    if (!connected) return;
    try {
      console.log("disconnect", 33333333);
      await invoke("disconnect");
      setConnected(false);
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const switchServer = async (server: IServer) => {
    try {
      // Switch UI first, then switch server connection
      setCurrentService(server);
      setEndpoint(server.endpoint);
      setMessages(""); // Clear previous messages
      onCreateNewChat();
      //
      await disconnect();
      reconnect && reconnect(server);
    } catch (error) {
      console.error("switchServer:", error);
    }
  };

  const togglePin = async () => {
    try {
      const newPinned = !isPinned;
      await getCurrentWindow().setAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
      setIsPinned(isPinned);
    }
  };

  const openSettings = async () => {
    emit("open_settings", "connect");
  };

  return (
    <header
      className="flex items-center justify-between py-2 px-3"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">
        <button
          data-sidebar-button
          onClick={(e) => {
            e.stopPropagation();
            setIsSidebarOpen();
          }}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <HistoryIcon />
        </button>

        <Menu>
          <MenuButton className="flex items-center gap-1 rounded-full bg-white dark:bg-[#202126] p-1 text-sm/6 font-semibold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none">
            <img
              src={logoImg}
              className="w-4 h-4"
              alt={t("assistant.message.logo")}
            />
            Coco AI
            <ChevronDownIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </MenuButton>

          <MenuItems
            transition
            anchor="bottom end"
            className="w-28 origin-top-right rounded-xl bg-white dark:bg-[#202126] p-1 text-sm/6 text-gray-800 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <MenuItem>
              <button className="group flex w-full items-center gap-2 rounded-lg py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                <img
                  src={logoImg}
                  className="w-4 h-4"
                  alt={t("assistant.message.logo")}
                />
                Coco AI
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>

        <button
          onClick={onCreateNewChat}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {activeChat?._source?.title || activeChat?._id}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={togglePin}
          className={`${isPinned ? "text-blue-500" : ""}`}
        >
          {isPinned ? <PinIcon /> : <PinOffIcon />}
        </button>

        <button onClick={onOpenChatAI}>
          <WindowsFullIcon />
        </button>

        <Popover className="relative">
          <PopoverButton className="flex items-center">
            <ServerIcon />
          </PopoverButton>

          <PopoverPanel className="absolute right-0 z-10 mt-2 min-w-[240px] bg-white dark:bg-[#202126] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3 whitespace-nowrap">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Servers
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openSettings}
                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  >
                    <Settings className="h-4 w-4 text-[#0287FF]" />
                  </button>
                  <button
                    onClick={async () => {
                      setIsRefreshing(true);
                      await fetchServers(false);
                      setTimeout(() => setIsRefreshing(false), 1000);
                    }}
                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    disabled={isRefreshing}
                  >
                    <RefreshCw
                      className={`h-4 w-4 text-[#0287FF] transition-transform duration-1000 ${
                        isRefreshing ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {serverList.length > 0 ? (
                  serverList.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => switchServer(server)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors whitespace-nowrap ${
                        currentService?.id === server.id
                          ? "bg-gray-100 dark:bg-gray-800"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={server?.provider?.icon || logoImg}
                          alt={server.name}
                          className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800"
                        />
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {server.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            AI Assistant: {server.assistantCount || 1}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            server.health?.status
                              ? `bg-[${server.health?.status}]`
                              : "bg-gray-400 dark:bg-gray-600"
                          }`}
                        />
                        <div className="w-4 h-4">
                          {currentService?.id === server.id && (
                            <Check className="w-full h-full text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Server className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("assistant.chat.noServers")}
                    </p>
                    <button
                      onClick={openSettings}
                      className="mt-2 text-xs text-[#0287FF] hover:underline"
                    >
                      {t("assistant.chat.addServer")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </PopoverPanel>
        </Popover>
      </div>
    </header>
  );
}
