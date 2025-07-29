import { useState, useCallback, useEffect, useRef } from "react";
import { Settings, RefreshCw, Check, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useKeyPress } from "ahooks";
import { isNil } from "lodash-es";

import logoImg from "@/assets/icon.svg";
import ServerIcon from "@/icons/Server";
import VisibleKey from "../Common/VisibleKey";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import { useConnectStore } from "@/stores/connectStore";
import { Server as IServer } from "@/types/server";
import StatusIndicator from "@/components/Cloud/StatusIndicator";
import { useAuthStore } from "@/stores/authStore";
import { useSearchStore } from "@/stores/searchStore";
interface ServerListProps {
  clearChat: () => void;
}

export function ServerList({ clearChat }: ServerListProps) {
  const { t } = useTranslation();

  const isCurrentLogin = useAuthStore((state) => state.isCurrentLogin);
  const setIsCurrentLogin = useAuthStore((state) => state.setIsCurrentLogin);
  const serviceListShortcut = useShortcutsStore(
    (state) => state.serviceListShortcut
  );
  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);
  const isTauri = useAppStore((state) => state.isTauri);
  const currentService = useConnectStore((state) => state.currentService);

  const { setMessages } = useChatStore();

  const [list, setList] = useState<IServer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highlightId, setHighlightId] = useState<string>("");

  const askAiServerId = useSearchStore((state) => {
    return state.askAiServerId;
  });
  const setAskAiServerId = useSearchStore((state) => {
    return state.setAskAiServerId;
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const serverListButtonRef = useRef<HTMLButtonElement>(null);

  const serverList = useConnectStore((state) => state.serverList);
  const fetchServers = useCallback(
    async (resetSelection: boolean) => {
      const enabledServers = serverList.filter(
        (server) => server.enabled && server.available
      );

      setList(enabledServers);

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
    },
    [currentService?.id]
  );

  useEffect(() => {
    if (!isTauri) return;

    fetchServers(true);
  }, [serverList]);

  useEffect(() => {
    if (!askAiServerId || serverList.length === 0) return;

    const matched = serverList.find((server) => {
      return server.id === askAiServerId;
    });

    if (!matched) return;

    switchServer(matched);
    setAskAiServerId(void 0);
  }, [serverList, askAiServerId]);

  useEffect(() => {
    if (!isTauri) return;

    fetchServers(true);

    const unlisten = platformAdapter.listenEvent("login_or_logout", (event) => {
      if (event.payload !== isCurrentLogin) {
        setIsCurrentLogin(!!event.payload);
      }
      fetchServers(true);
    });

    return () => {
      // Cleanup logic if needed
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchServers(false);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const openSettings = async () => {
    platformAdapter.emitEvent("open_settings", "connect");
  };

  const switchServer = async (server: IServer) => {
    if (!server) return;
    try {
      // Switch UI first, then switch server connection
      setCurrentService(server);
      setEndpoint(server.endpoint);
      setMessages(""); // Clear previous messages
      clearChat();
      //
      if (!server.public && !server.profile) {
        setIsCurrentLogin(false);
        return;
      }
      //
      setIsCurrentLogin(true);
    } catch (error) {
      console.error("switchServer:", error);
    }
  };

  useKeyPress(
    ["uparrow", "downarrow", "enter"],
    (event, key) => {
      const isClose = isNil(serverListButtonRef.current?.dataset["open"]);
      const length = serverList.length;

      if (isClose || length <= 1) return;

      event.stopPropagation();
      event.preventDefault();

      const currentIndex = serverList.findIndex((server) => {
        return (
          server.id === (highlightId === "" ? currentService?.id : highlightId)
        );
      });

      let nextIndex = currentIndex;

      if (key === "uparrow") {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : length - 1;
        setHighlightId(serverList[nextIndex].id);
      } else if (key === "downarrow") {
        nextIndex = currentIndex < serverList.length - 1 ? currentIndex + 1 : 0;
        setHighlightId(serverList[nextIndex].id);
      } else if (key === "enter" && currentIndex >= 0) {
        if (document.activeElement instanceof HTMLTextAreaElement) return;
        const selectedServer = serverList[currentIndex];
        if (selectedServer) {
          switchServer(selectedServer);
          serverListButtonRef.current?.click();
        }
      }
    },
    {
      target: popoverRef,
    }
  );

  const handleMouseMove = useCallback(() => {
    setHighlightId("");
  }, []);

  return (
    <Popover ref={popoverRef} className="relative">
      <PopoverButton ref={serverListButtonRef} className="flex items-center">
        <VisibleKey
          shortcut={serviceListShortcut}
          onKeyPress={() => {
            serverListButtonRef.current?.click();
          }}
        >
          <ServerIcon />
        </VisibleKey>
      </PopoverButton>

      <PopoverPanel
        onMouseMove={handleMouseMove}
        className="absolute right-0 z-10 mt-2 min-w-[240px] bg-white dark:bg-[#202126] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-3 whitespace-nowrap">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t("assistant.chat.servers")}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={openSettings}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              >
                <VisibleKey shortcut=",">
                  <Settings className="h-4 w-4 text-[#0287FF]" />
                </VisibleKey>
              </button>
              <button
                onClick={handleRefresh}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                disabled={isRefreshing}
              >
                <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
                  <RefreshCw
                    className={`h-4 w-4 text-[#0287FF] transition-transform duration-1000 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </VisibleKey>
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {list.length > 0 ? (
              list.map((server) => (
                <div
                  key={server.id}
                  onClick={() => switchServer(server)}
                  className={`w-full flex items-center justify-between gap-1 p-2 rounded-lg transition-colors whitespace-nowrap 
                    ${
                      currentService?.id === server.id ||
                      highlightId === server.id
                        ? "bg-gray-100 dark:bg-gray-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <img
                      src={server?.provider?.icon || logoImg}
                      alt={server.name}
                      className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = logoImg;
                      }}
                    />
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                        {server.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {t("assistant.chat.aiAssistant")}:{" "}
                        {server.stats?.assistant_count || 1}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <StatusIndicator
                      enabled={server.enabled}
                      public={server.public}
                      hasProfile={!!server?.profile}
                      status={server.health?.status}
                    />
                    <div className="size-4 flex justify-end">
                      {currentService?.id === server.id && (
                        <VisibleKey
                          shortcut="↓↑"
                          shortcutClassName="w-6 -translate-x-4"
                        >
                          <Check className="w-full h-full text-gray-500 dark:text-gray-400" />
                        </VisibleKey>
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
  );
}
