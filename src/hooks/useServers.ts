import { useEffect, useCallback } from "react";

import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import type { Server } from "@/types/server";
import { handleLogout } from "@/commands/servers";

export const useServers = () => {
  const setServerList = useConnectStore((state) => state.setServerList);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);
  const currentService = useConnectStore((state) => state.currentService);
  const serverList = useConnectStore((state) => state.serverList);

  const getAllServerList = async () => {
    try {
      const res = await platformAdapter.commands("list_coco_servers");
      if (!Array.isArray(res)) {
        // If res is not an array, it might be an error message or something else.
        // Log it and don't proceed.
        console.warn("Invalid server list response:", res);
        setServerList([]); // Clear the list or handle as appropriate
        return;
      }
      setServerList(res);
    } catch (error) {
      console.error("Failed to fetch server list:", error);
      setServerList([]);
    }
  };

  const fetchServers = useCallback(
    async (resetSelection: boolean, switchServer?: (server: Server) => void) => {
      const enabledServers = serverList.filter(
        (server) => server.enabled && server.available
      );

      if (resetSelection && enabledServers.length > 0 && switchServer) {
        const currentServiceExists = enabledServers.find(
          (server) => server.id === currentService?.id
        );

        if (currentServiceExists) {
          switchServer(currentServiceExists);
        } else {
          switchServer(enabledServers[enabledServers.length - 1]);
        }
      }

      return enabledServers;
    },
    [serverList, currentService?.id]
  );

  const addServer = useCallback(
    async (endpointLink: string): Promise<Server> => {
      if (!endpointLink) {
        throw new Error("Endpoint is required");
      }
      if (
        !endpointLink.startsWith("http://") &&
        !endpointLink.startsWith("https://")
      ) {
        throw new Error("Invalid Endpoint");
      }

      const res: Server = await platformAdapter.commands(
        "add_coco_server",
        endpointLink
      );
      await getAllServerList();
      setCurrentService(res);
      return res;
    },
    []
  );

  const enableServer = useCallback(
    async (enabled: boolean) => {
      if (!currentService?.id) {
        throw new Error("No current service selected");
      }

      if (enabled) {
        await platformAdapter.commands("enable_server", currentService.id);
      } else {
        await platformAdapter.commands("disable_server", currentService.id);
      }

      setCurrentService({ ...currentService, enabled });
      await getAllServerList();
    },
    [currentService]
  );

  const removeServer = useCallback(
    async (id: string) => {
      await platformAdapter.commands("remove_coco_server", id);
      await getAllServerList();
    },
    [currentService?.id]
  );

  const logoutServer = useCallback(
    async (id: string) => {
      await platformAdapter.commands("logout_coco_server", id);
      handleLogout(id);
      await getAllServerList();
    },
    []
  );

  useEffect(() => {
    getAllServerList();
  }, [currentService?.enabled]);

  return {
    getAllServerList,
    refreshServerList: getAllServerList,
    fetchServers,
    addServer,
    enableServer,
    removeServer,
    logoutServer,
  };
};
