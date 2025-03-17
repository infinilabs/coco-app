import {
  MessageSquarePlus,
  ChevronDownIcon,
  Settings,
  RefreshCw,
  Check,
  Server,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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
import platformAdapter from "@/utils/platformAdapter";

interface ChatHeaderProps {
  onCreateNewChat: () => void;
  onOpenChatAI: () => void;
  setIsSidebarOpen: () => void;
  isSidebarOpen: boolean;
  activeChat: Chat | undefined;
  reconnect: (server?: IServer) => void;
  setIsLogin: (isLogin: boolean) => void;
  isChatPage?: boolean;
}

export function ChatHeader({
  onCreateNewChat,
  onOpenChatAI,
  setIsSidebarOpen,
  activeChat,
  reconnect,
  setIsLogin,
  isChatPage = false,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const isPinned = useAppStore((state) => state.isPinned);
  const setIsPinned = useAppStore((state) => state.setIsPinned);

  const { connected, setMessages } = useChatStore();

  const [serverList, setServerList] = useState<IServer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentService = useConnectStore((state) => state.currentService);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const fetchServers = useCallback(async (resetSelection: boolean) => {
    platformAdapter.invokeBackend("list_coco_servers")
      .then((res: any) => {
        const enabledServers = (res as IServer[]).filter(
          (server) => server.enabled !== false
        );
        //console.log("list_coco_servers", enabledServers);
        setServerList(enabledServers);

        if (resetSelection && enabledServers.length > 0) {
          const currentServiceExists = enabledServers.find(
            (server) => server.id === currentService?.id
          );

          if (currentServiceExists) {
            switchServer(currentServiceExists);
          } else {
            switchServer(enabledServers[enabledServers.length - 1]);
          }
        }
      })
      .catch((err: any) => {
        console.error(err);
      });
  }, [currentService?.id]);

  useEffect(() => {
    fetchServers(true);

    const unlisten = platformAdapter.listenEvent("login_or_logout", (event) => {
      console.log("Login or Logout:", currentService, event);
      fetchServers(true);
    });

    return () => {
      // Cleanup logic if needed
      disconnect();
      unlisten.then((fn) => fn());
    };
  }, []);

  const disconnect = async () => {
    if (!connected) return;
    try {
      console.log("disconnect");
      await platformAdapter.invokeBackend("disconnect");
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const switchServer = async (server: IServer) => {
    if (!server) return;
    try {
      // Switch UI first, then switch server connection
      setCurrentService(server);
      setEndpoint(server.endpoint);
      setMessages(""); // Clear previous messages
      onCreateNewChat();
      //
      if (!server.public && !server.profile) {
        setIsLogin(false);
        return;
      }
      setIsLogin(true);
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
      await platformAdapter.setAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
      setIsPinned(isPinned);
    }
  };

  const openSettings = async () => {
    platformAdapter.emitEvent("open_settings", "connect");
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
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {activeChat?._source?.title ||
            activeChat?._source?.message ||
            activeChat?._id}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={togglePin}
          className={`${isPinned ? "text-blue-500" : ""}`}
        >
          {isPinned ? <PinIcon /> : <PinOffIcon />}
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
                    <div
                      key={server.id}
                      onClick={() => switchServer(server)}
                      className={`w-full flex items-center justify-between gap-1 p-2 rounded-lg transition-colors whitespace-nowrap ${
                        currentService?.id === server.id
                          ? "bg-gray-100 dark:bg-gray-800"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                        <img
                          src={server?.provider?.icon || logoImg}
                          alt={server.name}
                          className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800"
                        />
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                            {server.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
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
                    </div>
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

        {isChatPage ? null : (
          <button onClick={onOpenChatAI}>
            <WindowsFullIcon className="rotate-30 scale-x-[-1]" />
          </button>
        )}
      </div>
    </header>
  );
}
