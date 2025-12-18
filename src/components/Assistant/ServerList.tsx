import { useState, useCallback, useEffect, useRef } from "react";
import { Settings, RefreshCw, Check, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useKeyPress } from "ahooks";

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
import { useServers } from "@/hooks/useServers";
import {
  getCurrentWindowService,
  setCurrentWindowService,
} from "@/commands/windowService";

interface ServerListProps {
  clearChat: () => void;
}

export function ServerList({ clearChat }: ServerListProps) {
  const { t } = useTranslation();

  const setIsCurrentLogin = useAuthStore((state) => state.setIsCurrentLogin);
  const serviceListShortcut = useShortcutsStore(
    (state) => state.serviceListShortcut
  );
  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const isTauri = useAppStore((state) => state.isTauri);

  const currentService = useConnectStore((state) => state.currentService);
  const serverList = useConnectStore((state) => state.serverList);

  const { setMessages } = useChatStore();

  const [list, setList] = useState<IServer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highlightId, setHighlightId] = useState<string>("");

  const targetServerId = useSearchStore((state) => {
    return state.targetServerId;
  });
  const setTargetServerId = useSearchStore((state) => {
    return state.setTargetServerId;
  });
  const askAiServerId = useSearchStore((state) => {
    return state.askAiServerId;
  });
  const setAskAiServerId = useSearchStore((state) => {
    return state.setAskAiServerId;
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const serverListButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const { refreshServerList } = useServers();

  const switchServer = async (server: IServer) => {
    if (!server) return;
    try {
      // Switch UI first, then switch server connection
      await setCurrentWindowService(server);
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

  const fetchServers = useCallback(async () => {
    const service = await getCurrentWindowService();

    const enabledServers = serverList.filter(
      (server) => server.enabled && server.available
    );
    setList(enabledServers);

    if (enabledServers.length > 0) {
      const serviceExists = enabledServers.find((server) => {
        return server.id === service?.id;
      });

      if (serviceExists) {
        switchServer(serviceExists);
      } else {
        switchServer(enabledServers[enabledServers.length - 1]);
      }
    } else {
      setCurrentWindowService({});
    }
  }, [serverList]);

  useEffect(() => {
    const targetId = targetServerId ?? askAiServerId;
    if (!targetId || list.length === 0) return;

    const matched = list.find((server) => server.id === targetId);
    if (!matched) return;

    switchServer(matched);
    setHighlightId(matched.id);
    if (targetServerId) {
      setTargetServerId(void 0);
    } else {
      setAskAiServerId(void 0);
    }
  }, [list, askAiServerId, targetServerId]);

  useEffect(() => {
    if (!isTauri) return;

    fetchServers();
  }, [serverList]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshServerList();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const openSettings = async () => {
    platformAdapter.emitEvent("open_settings", "connect");
  };

  useKeyPress(
    ["uparrow", "downarrow", "enter"],
    async (event, key) => {
      const service = await getCurrentWindowService();
      const isClose = !open;
      const length = serverList.length;

      if (isClose || length <= 1) return;

      event.stopPropagation();
      event.preventDefault();

      const currentIndex = serverList.findIndex((server) => {
        return server.id === (highlightId === "" ? service?.id : highlightId);
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
    <div ref={popoverRef} className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger ref={serverListButtonRef} className="flex items-center">
          <VisibleKey
            shortcut={serviceListShortcut}
            onKeyPress={() => {
              serverListButtonRef.current?.click();
            }}
          >
            <ServerIcon />
          </VisibleKey>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="end"
          onMouseMove={handleMouseMove}
          className="z-10 min-w-60 rounded-lg shadow-lg"
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3 whitespace-nowrap">
              <h3 className="text-sm font-medium text-foreground">
                {t("assistant.chat.servers")}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={openSettings}
                  variant="ghost"
                  size="icon"
                  className="rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <VisibleKey shortcut=",">
                    <Settings className="h-4 w-4 text-primary" />
                  </VisibleKey>
                </Button>
                <Button
                  onClick={handleRefresh}
                  variant="ghost"
                  size="icon"
                  className="rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isRefreshing}
                >
                  <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
                    <RefreshCw
                      className={`h-4 w-4 text-primary transition-transform duration-1000 ${
                        isRefreshing ? "animate-spin" : ""
                      }`}
                    />
                  </VisibleKey>
                </Button>
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
                        ? "bg-muted"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={server?.provider?.icon || logoImg}
                        alt={server.name}
                        className="w-6 h-6 rounded-full  dark:drop-shadow-[0_0_6px_rgb(255,255,255)]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = logoImg;
                        }}
                      />
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {server.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
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
                            <Check className="w-full h-full text-muted-foreground" />
                          </VisibleKey>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Server className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
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
        </PopoverContent>
      </Popover>
    </div>
  );
}
