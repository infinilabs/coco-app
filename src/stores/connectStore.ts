import { create } from "zustand";
import { persist } from "zustand/middleware";
import { produce } from 'immer'

type keyArrayObject = {
  [key: string]: any[];
};

export type IConnectStore = {
  defaultService: any;
  setDefaultService: (service: any) => void;
  otherServices: any[];
  addOtherServices: (service: any) => void;
  deleteOtherService: (service: any) => void;
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
      defaultService: {
        "name": "Coco Cloud",
        "endpoint": "https://coco.infini.cloud/",
        "provider": {
          "name": "INFINI Labs",
          "icon": "https://coco.infini.cloud/icon.png",
          "website": "http://infinilabs.com",
          "eula": "http://infinilabs.com/eula.txt",
          "privacy_policy": "http://infinilabs.com/privacy_policy.txt",
          "banner": "https://coco.infini.cloud/banner.jpg",
          "description": "Coco AI Server - Search, Connect, Collaborate, AI-powered enterprise search, all in one space."
        },
        "version": {
          "number": "1.0.0_SNAPSHOT"
        },
        "updated": "2025-01-24T12:12:17.326286927+08:00",
        "builtin": true,
        "public": false,
        "auth_provider": {
          "sso": {
            "url": "https://coco.infini.cloud/sso/login/"
          }
        }
      },
      setDefaultService: (defaultService: any) => set(
        produce((draft) => {
          draft.defaultService = defaultService
        })
      ),
      otherServices: [],
      addOtherServices: (otherService: any) => {
        set(produce((draft) => {
          draft.otherServices.push(otherService);
        }))
      },
      deleteOtherService: (service: any) => {
        set(produce((draft) => {
          draft.otherServices = draft.otherServices.filter(
            (item: any) => item.endpoint !== service.endpoint
          );
          draft.currentService = draft.defaultService;
        }))
      },
      currentService: {
        "name": "Coco Cloud",
        "endpoint": "https://coco.infini.cloud/",
        "provider": {
          "name": "INFINI Labs",
          "icon": "https://coco.infini.cloud/icon.png",
          "website": "http://infinilabs.com",
          "eula": "http://infinilabs.com/eula.txt",
          "privacy_policy": "http://infinilabs.com/privacy_policy.txt",
          "banner": "https://coco.infini.cloud/banner.jpg",
          "description": "Coco AI Server - Search, Connect, Collaborate, AI-powered enterprise search, all in one space."
        },
        "version": {
          "number": "1.0.0_SNAPSHOT"
        },
        "updated": "2025-01-24T12:12:17.326286927+08:00",
        "builtin": true,
        "public": false,
        "auth_provider": {
          "sso": {
            "url": "https://coco.infini.cloud/sso/login/"
          }
        }
      },
      setCurrentService: (currentService: any) => {
        set(produce((draft) => {
          draft.currentService = currentService;
        }))
      },
      connector_data: {},
      setConnectorData: async (connector_data: any[], key: string) => {
        set(
          produce((draft) => {
            draft.connector_data[key] = connector_data
          })
        );
      },
      datasourceData: {},
      setDatasourceData: async (datasourceData: any[], key: string) => {
        set(
          produce((draft) => {
            draft.datasourceData[key] = datasourceData
          })
        );
      },
    }),
    {
      name: "connect-store",
      partialize: (state) => ({
        defaultService: state.defaultService,
        otherServices: state.otherServices,
        currentService: state.currentService,
        connector_data: state.connector_data,
        datasourceData: state.datasourceData,
      }),
    }
  )
);
