import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ApiLog {
  request: any;
  response?: any;
  error?: any;
}

export type ILogStore = {
  logs: ApiLog[];
  addLog: (log: ApiLog) => void;
  initializeListeners: () => void;
};

export const useLogStore = create<ILogStore>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (log: ApiLog) =>
        set((state) => {
          const newLogs = [...state.logs, log];
          if (newLogs.length > 10) {
            newLogs.shift();
          }
          return { logs: newLogs };
        }),
      initializeListeners: () => {
      },
    }),
    {
      name: "log-store",
      partialize: (state) => ({
        logs: state.logs
      }),
    }
  )
);
