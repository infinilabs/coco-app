import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useConnectStore } from '@/stores/connectStore';
import { useChatStore } from '@/stores/chatStore';
import { Server as IServer } from '@/types/server';
import platformAdapter from '@/utils/platformAdapter';

interface UseServerListProps {
  reconnect: (server?: IServer) => void;
  clearChat: () => void;
}

export const useServerList = ({ reconnect, clearChat }: UseServerListProps) => {
  const [serverList, setServerList] = useState<IServer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isCurrentLogin, setIsCurrentLogin } = useAuthStore();
  const { setEndpoint, isTauri } = useAppStore();
  const { currentService, setCurrentService } = useConnectStore();
  const { setMessages } = useChatStore();

  const fetchServers = useCallback(
      async (resetSelection: boolean) => {
        platformAdapter
          .commands("list_coco_servers")
          .then((res: any) => {
            const enabledServers = (res as IServer[]).filter(
              (server) => server.enabled && server.available
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
      },
      [currentService?.id]
    );

  const switchServer = useCallback(async (server: IServer) => {
    if (!server) return;
    try {
      // Switch UI first, then switch server connection
      setCurrentService(server);
      setEndpoint(server.endpoint);
      setMessages(""); // Clear previous messages
      clearChat();

      if (!server.public && !server.profile) {
        setIsCurrentLogin(false);
        return;
      }

      setIsCurrentLogin(true);
      reconnect(server);
    } catch (error) {
      console.error("switchServer:", error);
    }
  }, [setCurrentService, setEndpoint, setMessages, clearChat, setIsCurrentLogin, reconnect]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchServers(false);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [fetchServers]);

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
      unlisten.then((fn) => fn());
    };
  }, [isTauri, fetchServers, isCurrentLogin, setIsCurrentLogin]);

  return {
    serverList,
    isRefreshing,
    currentService,
    handleRefresh,
    switchServer,
    fetchServers
  };
};