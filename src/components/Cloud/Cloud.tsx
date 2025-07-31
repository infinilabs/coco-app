import { useEffect, useRef, useState, useCallback } from "react";

import { DataSourcesList } from "./DataSourcesList";
import { Sidebar } from "./Sidebar";
import { Connect } from "./Connect";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import ServiceInfo from "./ServiceInfo";
import ServiceAuth from "./ServiceAuth";
import platformAdapter from "@/utils/platformAdapter";
import type { Server } from "@/types/server";
import { useServers } from "@/hooks/useServers";

export default function Cloud() {
  const SidebarRef = useRef<{ refreshData: () => void }>(null);

  const errors = useAppStore((state) => state.errors);

  const [isConnect, setIsConnect] = useState(true);

  const { cloudSelectService, setCloudSelectService, serverList, setServerList } =
    useConnectStore();

  const [refreshLoading, setRefreshLoading] = useState(false);

  const { addServer, refreshServerList } = useServers();

  // fetch the servers
  useEffect(() => {
    fetchServers();
  }, [serverList]);

  useEffect(() => {
    setRefreshLoading(false);
    setIsConnect(true);
  }, [cloudSelectService?.id]);

  const fetchServers = useCallback(
    async () => {
      let res = serverList;
      if (errors.length > 0) {
        res = res.map((item: Server) => {
          if (item.id === cloudSelectService?.id) {
            item.health = {
              services: item.health?.services || {},
              status: item.health?.status || "red",
            };
          }
          return item;
        });
      }
      setServerList(res);

      if (res.length > 0) {
        const matched = res.find((server: any) => {
          return server.id === cloudSelectService?.id;
        });

        if (matched) {
          setCloudSelectService(matched);
        } else {
          setCloudSelectService(res[res.length - 1]);
        }
      }
    },
    [serverList, errors, cloudSelectService]
  );

  const refreshClick = useCallback(
    async (id: string) => {
      setRefreshLoading(true);
      await platformAdapter.commands("refresh_coco_server_info", id);
      await refreshServerList();
      setRefreshLoading(false);
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
