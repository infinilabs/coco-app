import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Application {
  path: string;
  name: string;
  iconPath: string;
  alias: string;
  hotkey: string;
  isDisabled: boolean;
}

export interface ApplicationMetadata {
  name: string;
  where: string;
  size: number;
  icon: string;
  created: number;
  modified: number;
  lastOpened: number;
}

export type IUpdateStore = {
  allApps: Application[];
  setAllApps: (appApps: Application[]) => void;
  searchPaths: string[];
  setSearchPaths: (searchPaths: string[]) => void;
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
    }),
    {
      name: "applications-store",
      partialize: () => ({}),
    }
  )
);
