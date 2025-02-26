import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ISearchStore = {
  sourceData: any;
  setSourceData: (sourceData: any) => void;
  sourceDataIds: string[];
  setSourceDataIds: (prevSourceDataId: string[]) => void;
};

export const useSearchStore = create<ISearchStore>()(
  persist(
    (set) => ({
      sourceData: undefined,
      setSourceData: (sourceData: any) => set({ sourceData }),
      sourceDataIds: [],
      setSourceDataIds: (sourceDataIds: string[]) => set({ sourceDataIds }),
    }),
    {
      name: "search-store",
      partialize: (state) => ({
        sourceData: state.sourceData,
      }),
    }
  )
);
