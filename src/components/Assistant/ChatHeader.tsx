import {
  MessageSquarePlus,
  PictureInPicture2,
  Pin,
  PinOff,
  MoreHorizontal,
  ChevronDownIcon,
  Settings,
  RefreshCw,
  Check,
  PanelRightClose,
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
import { useAppStore } from "@/stores/appStore"

interface Server {
  id: string;
  name: string;
  available: boolean;
  endpoint: string;
  provider: {
    icon: string;
  };
  assistantCount?: number;
}

interface ChatHeaderProps {
  onCreateNewChat: () => void;
  onOpenChatAI: () => void;
}

export function ChatHeader({ onCreateNewChat, onOpenChatAI }: ChatHeaderProps) {
  const { t } = useTranslation();

  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const isPinned = useAppStore((state) => state.isPinned);
  const setIsPinned = useAppStore((state) => state.setIsPinned);

  const [serverList, setServerList] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchServers = async (resetSelection: boolean) => {
    invoke("list_coco_servers")
      .then((res: any) => {
        setServerList(res);
        if (resetSelection && res.length > 0) {
          setSelectedServer(res[0].id);
          setEndpoint(res[0].endpoint);
        } else {
          console.warn("Service list is empty or last item has no id");
        }
      })
      .catch((err: any) => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchServers(true);
  }, []);

  const togglePin = async () => {
    try {
      const newPinned = !isPinned;
      await getCurrentWindow().setAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
    } catch (err) {
      console.error('Failed to toggle window pin state:', err);
      setIsPinned(isPinned);
    }
  };

  const openSettings = async () => {
    emit("open_settings", "connect");
  };
  
  const openHistList = async () => {
  };

  return (
    <header
      className="flex items-center justify-between py-2 px-3"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">
        <button
          onClick={openHistList}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <PanelRightClose className="h-4 w-4" />
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

      <div className="flex items-center gap-2">
        <button
          onClick={togglePin}
          className={`rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isPinned ? "text-blue-500" : ""
          }`}
        >
          {isPinned ? (
            <Pin className="h-4 w-4" />
          ) : (
            <PinOff className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={onOpenChatAI}
          className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <PictureInPicture2 className="h-4 w-4" />
        </button>

        <Popover className="relative">
          <PopoverButton className="flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <MoreHorizontal className="h-4 w-4" />
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
                {serverList.map((server) => (
                  <button
                    key={server.id}
                    onClick={() => {
                      setSelectedServer(server.id)
                      setEndpoint(server.endpoint)
                     }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors whitespace-nowrap ${
                      selectedServer === server.id
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
                          server.available
                            ? "bg-[#00B926]"
                            : "bg-gray-400 dark:bg-gray-600"
                        }`}
                      />
                      <div className="w-4 h-4">
                        {selectedServer === server.id && (
                          <Check className="w-full h-full text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </PopoverPanel>
        </Popover>
      </div>
    </header>
  );
}
