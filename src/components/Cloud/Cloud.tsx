import { useEffect, useRef, useState, useCallback } from "react";
import { isEqual } from "lodash-es";
import { usePrevious } from "ahooks";

import { DataSourcesList } from "./DataSourcesList";
import { Sidebar } from "./Sidebar";
import { Connect } from "./Connect";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import ServiceInfo from "./ServiceInfo";
import ServiceAuth from "./ServiceAuth";
import type { Server } from "@/types/server";
import { useServers } from "@/hooks/useServers";
import platformAdapter from "@/utils/platformAdapter";

export default function Cloud() {
  const SidebarRef = useRef<{ refreshData: () => void }>(null);

  const errors = useAppStore((state) => state.errors);

  const [isConnect, setIsConnect] = useState(true);

  const {
    cloudSelectService,
    setCloudSelectService,
    serverList,
    setServerList,
  } = useConnectStore();
  const prevServerList = usePrevious(serverList);

  const [refreshLoading, setRefreshLoading] = useState(false);

  const { addServer, refreshServerList } = useServers();

  // fetch the servers
  useEffect(() => {
    if (isEqual(prevServerList, serverList)) return;

    fetchServers();
  }, [serverList]);

  useEffect(() => {
    setRefreshLoading(false);
    setIsConnect(true);
  }, [cloudSelectService?.id]);

  const fetchServers = useCallback(async () => {
    let { serverList } = useConnectStore.getState();

    if (errors.length > 0) {
      serverList = serverList.map((item: Server) => {
        if (item.id === cloudSelectService?.id) {
          return {
            ...item,
            health: {
              services: item.health?.services || {},
              status: item.health?.status || "red",
            },
          };
        }
        return item;
      });
    }

    setServerList(serverList);

    if (serverList.length > 0) {
      const matched = serverList.find((server: any) => {
        return server.id === cloudSelectService?.id;
      });

      if (matched) {
        setCloudSelectService(matched);
      } else {
        setCloudSelectService(serverList[serverList.length - 1]);
      }
    }
  }, [errors, cloudSelectService]);

  const refreshClick = useCallback(
    async (id: string, callback?: () => void) => {
      setRefreshLoading(true);
      await platformAdapter.commands("refresh_coco_server_info", id);
      await refreshServerList();
      setRefreshLoading(false);
      callback && callback();
    },
    [refreshServerList]
  );

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900">
      <Sidebar
        ref={SidebarRef}
        setIsConnect={setIsConnect}
        serverList={serverList}
      />

      <main className="flex-1 p-4 py-8">
        {isConnect ? (
          <div className="max-w-4xl mx-auto">
            <ServiceInfo
              refreshLoading={refreshLoading}
              refreshClick={refreshClick}
            />

            <ServiceAuth
              setRefreshLoading={setRefreshLoading}
              refreshClick={refreshClick}
            />

            {cloudSelectService?.profile && cloudSelectService?.available ? (
              <DataSourcesList server={cloudSelectService?.id} />
            ) : null}
          </div>
        ) : (
          <Connect setIsConnect={setIsConnect} onAddServer={addServer} />
        )}
      </main>
    </div>
  );
}
