import { useEffect, useCallback } from "react";

import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import type { Server } from "@/types/server";
import {
  getCurrentWindowService,
  setCurrentWindowService,
  handleLogout,
} from "@/commands/windowService";

export const useServers = () => {
  const setServerList = useConnectStore((state) => state.setServerList);
  const currentService = useConnectStore((state) => state.currentService);
  const cloudSelectService = useConnectStore((state) => {
    return state.cloudSelectService;
  });

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
    } finally {
      
    }
  };

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
      await setCurrentWindowService(res);
      return res;
    },
    []
  );

  const enableServer = useCallback(
    async (enabled: boolean) => {
      const service = await getCurrentWindowService();

      if (!service?.id) {
        throw new Error("No current service selected");
      }

      if (enabled) {
        await platformAdapter.commands("enable_server", service.id);
      } else {
        await platformAdapter.commands("disable_server", service.id);
      }

      await setCurrentWindowService({ ...service, enabled });
      await getAllServerList();
    },
    [currentService, cloudSelectService]
  );

  const removeServer = useCallback(
    async (id: string) => {
      await platformAdapter.commands("remove_coco_server", id);
      await getAllServerList();
    },
    [currentService?.id, cloudSelectService?.id]
  );

  const logoutServer = useCallback(async (id: string) => {
    await platformAdapter.commands("logout_coco_server", id);
    handleLogout(id);
    await getAllServerList();
  }, []);

  useEffect(() => {
    getAllServerList();
  }, [currentService?.enabled, cloudSelectService?.enabled]);

  return {
    getAllServerList,
    refreshServerList: getAllServerList,
    addServer,
    enableServer,
    removeServer,
    logoutServer,
  };
};
