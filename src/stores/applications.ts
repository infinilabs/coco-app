import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Application {
  name: string;
  size: number;
  icon: string;
  where: string;
  created: number;
  modified: number;
  lastOpened: number;
}

export type IUpdateStore = {
  allApps: Application[];
  setAllApps: (appApps: Application[]) => void;
  searchPaths: string[];
  setSearchPaths: (searchPaths: string[]) => void;
  disabledApps: string[];
  setDisabledApps: (disabledApps: string[]) => void;
};

export const useApplicationsStore = create<IUpdateStore>()(
  persist(
    (set) => ({
      allApps: [],
      setAllApps: (allApps: Application[]) => {
        return set({ allApps });
      },
      searchPaths: [],
      setSearchPaths: (searchPaths: string[]) => {
        return set({ searchPaths });
      },
      disabledApps: [],
      setDisabledApps: (disabledApps: string[]) => {
        return set({ disabledApps });
      },
    }),
    {
      name: "applications-store",
      partialize: (state) => ({
        searchPaths: state.searchPaths,
        disabledApps: state.disabledApps,
      }),
    }
  )
);
