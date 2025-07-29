import { useEffect, useRef, useState, useCallback } from "react";
import { emit } from "@tauri-apps/api/event";

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

  const { currentService, setCurrentService, serverList, setServerList } =
    useConnectStore();

  const [refreshLoading, setRefreshLoading] = useState(false);

  const { addServer } = useServers();

  // fetch the servers
  useEffect(() => {
    fetchServers(true);
  }, [serverList]);

  useEffect(() => {
    // console.log("currentService", currentService);
    setRefreshLoading(false);
    setIsConnect(true);
  }, [currentService?.id]);

  const fetchServers = useCallback(async (resetSelection: boolean) => {
    let res = serverList;
    if (errors.length > 0) {
      res = res.map((item: Server) => {
        if (item.id === currentService?.id) {
          item.health = {
            services: item.health?.services || {},
            status: item.health?.status || 'red',
          };
        }
        return item;
      });
    }
    setServerList(res);

    if (resetSelection && res.length > 0) {
      const matched = res.find((server: any) => {
        return server.id === currentService?.id;
      });

      if (matched) {
        setCurrentService(matched);
      } else {
        setCurrentService(res[res.length - 1]);
      }
    }
  }, [serverList, errors, currentService]);

  const refreshClick = useCallback(
    (id: string) => {
      setRefreshLoading(true);
      platformAdapter
        .commands("refresh_coco_server_info", id)
        .then((res: any) => {
          // Todo: update list
          fetchServers(false).then(() => {
          });
          // update currentService
          setCurrentService(res);
          emit("login_or_logout", true);
        })
        .finally(() => {
          setRefreshLoading(false);
        });
    },
    [fetchServers]
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

            {currentService?.profile && currentService?.available ? (
              <DataSourcesList server={currentService?.id} />
            ) : null}
          </div>
        ) : (
          <Connect setIsConnect={setIsConnect} onAddServer={addServer} />
        )}
      </main>
    </div>
  );
}
