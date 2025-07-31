import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { produce } from "immer";

import platformAdapter from "@/utils/platformAdapter";
import type { Server } from "@/types/server";

const CONNECTOR_CHANGE_EVENT = "connector_data_change";
const DATASOURCE_CHANGE_EVENT = "datasourceData_change";

type keyArrayObject = {
  [key: string]: any[];
};

export type IConnectStore = {
  serverList: Server[];
  setServerList: (servers: Server[]) => void;
  currentService: Server;
  setCurrentService: (service: Server) => void;
  cloudSelectService: Server;
  setCloudSelectService: (service: Server) => void;
  connector_data: keyArrayObject;
  setConnectorData: (connector_data: any[], key: string) => void;
  datasourceData: keyArrayObject;
  setDatasourceData: (datasourceData: any[], key: string) => void;
  connectionTimeout?: number;
  setConnectionTimeout: (connectionTimeout?: number) => void;
  currentSessionId?: string;
  setCurrentSessionId: (currentSessionId?: string) => void;
  assistantList: any[];
  setAssistantList: (assistantList: []) => void;
  currentAssistant: any;
  setCurrentAssistant: (assistant: any) => void;
  querySourceTimeout?: number;
  setQuerySourceTimeout: (queryTimeout?: number) => void;
  visibleStartPage: boolean;
  setVisibleStartPage: (visibleStartPage: boolean) => void;
  allowSelfSignature: boolean;
  setAllowSelfSignature: (allowSelfSignature: boolean) => void;
};

export const useConnectStore = create<IConnectStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        serverList: [],
        setServerList: (serverList: Server[]) => {
          set(
            produce((draft) => {
              draft.serverList = serverList;
            })
          );
        },
        currentService: {} as Server,
        setCurrentService: (server: any) => {
          set(
            produce((draft) => {
              draft.currentService = server;
            })
          );
        },
        cloudSelectService: {} as Server,
        setCloudSelectService: (server: any) => {
          set(
            produce((draft) => {
              draft.cloudSelectService = server;
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
          await platformAdapter.emitEvent(CONNECTOR_CHANGE_EVENT, {
            connector_data,
          });
        },
        datasourceData: {},
        setDatasourceData: async (datasourceData: any[], key: string) => {
          set(
            produce((draft) => {
              draft.datasourceData[key] = datasourceData;
            })
          );
          await platformAdapter.emitEvent(DATASOURCE_CHANGE_EVENT, {
            datasourceData,
          });
        },
        initializeListeners: () => {
          platformAdapter.listenEvent(CONNECTOR_CHANGE_EVENT, (event: any) => {
            const { connector_data } = event.payload;
            set({ connector_data });
          });
          platformAdapter.listenEvent(DATASOURCE_CHANGE_EVENT, (event: any) => {
            const { datasourceData } = event.payload;
            set({ datasourceData });
          });
        },
        connectionTimeout: 120,
        setConnectionTimeout: (connectionTimeout) => {
          return set(() => ({ connectionTimeout }));
        },
        setCurrentSessionId(currentSessionId) {
          return set(() => ({ currentSessionId }));
        },
        assistantList: [],
        setAssistantList: (assistantList) => {
          return set(() => ({ assistantList }));
        },
        currentAssistant: null,
        setCurrentAssistant: (assistant: any) => {
          set(
            produce((draft) => {
              draft.currentAssistant = assistant;
            })
          );
        },
        querySourceTimeout: 500,
        setQuerySourceTimeout: (queryTimeout) => {
          set(
            produce((draft) => {
              draft.querySourceTimeout = queryTimeout;
            })
          );
        },
        visibleStartPage: false,
        setVisibleStartPage: (visibleStartPage: boolean) => {
          return set(() => ({ visibleStartPage }));
        },
        allowSelfSignature: false,
        setAllowSelfSignature: (allowSelfSignature: boolean) => {
          return set(() => ({ allowSelfSignature }));
        },
      }),
      {
        name: "connect-store",
        partialize: (state) => ({
          serverList: state.serverList,
          currentService: state.currentService,
          cloudSelectService: state.cloudSelectService,
          connector_data: state.connector_data,
          datasourceData: state.datasourceData,
          connectionTimeout: state.connectionTimeout,
          currentAssistant: state.currentAssistant,
          querySourceTimeout: state.querySourceTimeout,
          allowSelfSignature: state.allowSelfSignature,
        }),
      }
    )
  )
);
