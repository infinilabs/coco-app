import { useEffect, useRef, useState, useCallback } from "react";
import { emit } from "@tauri-apps/api/event";

import { DataSourcesList } from "./DataSourcesList";
import { Sidebar } from "./Sidebar";
import { Connect } from "./Connect";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import {
  list_coco_servers,
  add_coco_server,
  refresh_coco_server_info,
} from "@/commands";
import ServiceInfo from "./ServiceInfo";
import ServiceAuth from "./ServiceAuth";

export default function Cloud() {
  const SidebarRef = useRef<{ refreshData: () => void }>(null);

  const errors = useAppStore((state) => state.errors);

  const [isConnect, setIsConnect] = useState(true);

  const { currentService, setCurrentService, serverList, setServerList } =
    useConnectStore();

  const [refreshLoading, setRefreshLoading] = useState(false);

  // fetch the servers
  useEffect(() => {
    fetchServers(true);
  }, []);

  useEffect(() => {
    // console.log("currentService", currentService);
    setRefreshLoading(false);
    setIsConnect(true);
  }, [JSON.stringify(currentService)]);

  const fetchServers = async (resetSelection: boolean) => {
    list_coco_servers()
      .then((res: any) => {
        if (errors.length > 0) {
          res = (res || []).map((item: any) => {
            if (item.id === currentService?.id) {
              item.health = {
                services: null,
                status: null,
              };
            }
            return item;
          });
        }
        // console.log("list_coco_servers", res);
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
      })
      .catch((err: any) => {
        console.error(err);
      });
  };

  const addServer = (endpointLink: string) => {
    if (!endpointLink) {
      throw new Error("Endpoint is required");
    }
    if (
      !endpointLink.startsWith("http://") &&
      !endpointLink.startsWith("https://")
    ) {
      throw new Error("Invalid Endpoint");
    }

    setRefreshLoading(true);

    return add_coco_server(endpointLink)
      .then((res: any) => {
        // console.log("add_coco_server", res);
        fetchServers(false).then((r) => {
          console.log("fetchServers", r);
          setCurrentService(res);
        });
      })
      .finally(() => {
        setRefreshLoading(false);
      });
  };

  const refreshClick = useCallback(
    (id: string) => {
      setRefreshLoading(true);
      refresh_coco_server_info(id)
        .then((res: any) => {
          console.log("refresh_coco_server_info", id, res);
          fetchServers(false).then((r) => {
            console.log("fetchServers", r);
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
              fetchServers={fetchServers}
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
