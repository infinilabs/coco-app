import { create } from "zustand";
import { persist } from "zustand/middleware";
import { produce } from "immer";

type keyArrayObject = {
  [key: string]: any[];
};

export type IConnectStore = {
  serverList: any[];
  setServerList: (servers: []) => void;
  currentService: any;
  setCurrentService: (service: any) => void;
  connector_data: keyArrayObject;
  setConnectorData: (connector_data: any[], key: string) => void;
  datasourceData: keyArrayObject;
  setDatasourceData: (datasourceData: any[], key: string) => void;
  connectionTimeout: number;
  setConnectionTimeout: (connectionTimeout: number) => void;
};

export const useConnectStore = create<IConnectStore>()(
  persist(
    (set) => ({
      serverList: [],
      setServerList: (serverList: []) => {
        console.log("set serverList:", serverList);
        set(
          produce((draft) => {
            draft.serverList = serverList;
          })
        );
      },
      currentService: "default_coco_server",
      setCurrentService: (server: any) => {
        console.log("set default server:", server);
        set(
          produce((draft) => {
            draft.currentService = server;
          })
        );
      },
      connector_data: {},
      setConnectorData: async (connector_data: any[], key: string) => {
        set(
          produce((draft) => {
            draft.connector_data[key] = connector_data;
          })
        );
      },
      datasourceData: {},
      setDatasourceData: async (datasourceData: any[], key: string) => {
        set(
          produce((draft) => {
            draft.datasourceData[key] = datasourceData;
          })
        );
      },
      connectionTimeout: 120,
      setConnectionTimeout: (connectionTimeout: number) => {
        return set(() => ({ connectionTimeout }));
      },
    }),
    {
      name: "connect-store",
      partialize: (state) => ({
        currentService: state.currentService,
        connector_data: state.connector_data,
        datasourceData: state.datasourceData,
        connectionTimeout: state.connectionTimeout,
      }),
    }
  )
);
