import { create } from "zustand";
import { persist } from "zustand/middleware";

import { connect_coco_cloud } from "@/stores/ConnectData";

export type IConnectStore = {
  defaultService: any;
  setDefaultService: (service: any) => void;
  otherServices: any[];
  addOtherServices: (service: any) => void;
  deleteOtherService: (service: any) => void;
  currentService: any;
  setCurrentService: (service: any) => void;

};

export const useConnectStore = create<IConnectStore>()(
  persist(
    (set) => ({
      defaultService: connect_coco_cloud,
      setDefaultService: (defaultService: any) => set({ defaultService }),
      otherServices: [],
      addOtherServices: (otherService: any) => {
        set((state) => {
          const newOtherServices = [...state.otherServices, otherService];
          return { otherServices: newOtherServices };
        })
      },
      deleteOtherService: (service: any) => {
        set((state) => {
          const newOtherServices = state.otherServices.filter(item => item.endpoint !== service.endpoint);

          return {
            otherServices: newOtherServices,
            currentService: state.defaultService,
          };
        })
      },
      currentService: connect_coco_cloud,
      setCurrentService: (currentService: any) => {
        set({ currentService })
      },
    }),
    {
      name: "connect-store",
      partialize: (state) => ({
        defaultService: state.defaultService,
        otherServices: state.otherServices,
        currentService: state.currentService,
      }),
    }
  )
);
