import { create } from "zustand";
import { persist } from "zustand/middleware";
import { produce } from 'immer'
import { listen, emit } from "@tauri-apps/api/event";

const CONNECTOR_CHANGE_EVENT = "connector_data_change";
const DATASOURCE_CHANGE_EVENT = "datasourceData_change";

type keyArrayObject = {
  [key: string]: any[];
};

export type IConnectStore = {
  serverList: any[];
  setServerList: (servers: []) => void;
  currentService: any;
  setCurrentService: (service: any) => void;
  connector_data: keyArrayObject,
  setConnectorData: (connector_data: any[], key: string) => void,
  datasourceData: keyArrayObject,
  setDatasourceData: (datasourceData: any[], key: string) => void,
};

export const useConnectStore = create<IConnectStore>()(
  persist(
    (set) => ({
      serverList: [],
      setServerList: (serverList: []) => {
        console.log("set serverList:", serverList)
        set(produce((draft) => {
          draft.serverList = serverList;
        }))
      },
      currentService: "default_coco_server",
      setCurrentService: (server: any) => {
        console.log("set default server:", server)
        set(produce((draft) => {
          draft.currentService = server;
        }))
      },
      connector_data: {},
      setConnectorData: async (connector_data: any[], key: string) => {
        set(
          produce((draft) => {
            draft.connector_data[key] = connector_data
          })
        );
        await emit(CONNECTOR_CHANGE_EVENT, {
          connector_data,
        });
      },
      datasourceData: {},
      setDatasourceData: async (datasourceData: any[], key: string) => {
        set(
          produce((draft) => {
            draft.datasourceData[key] = datasourceData
          })
        );
        await emit(DATASOURCE_CHANGE_EVENT, {
          datasourceData,
        });
      },
      initializeListeners: () => {
        listen(CONNECTOR_CHANGE_EVENT, (event: any) => {
          const { connector_data } = event.payload;
          set({ connector_data });
        });
        listen(DATASOURCE_CHANGE_EVENT, (event: any) => {
          const { datasourceData } = event.payload;
          set({ datasourceData });
        });
      },
    }),
    {
      name: "connect-store",
      partialize: (state) => ({
        currentService: state.currentService,
        connector_data: state.connector_data,
        datasourceData: state.datasourceData,
      }),
    }
  )
);