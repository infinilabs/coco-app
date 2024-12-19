import { create } from "zustand";
import {
  persist,
  // createJSONStorage
} from "zustand/middleware";
import { AppTheme } from "../utils/tauri";

export type IThemeStore = {
  themes: AppTheme[];
  activeTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

export const useThemeStore = create<IThemeStore>()(
  persist(
    (set) => ({
      themes: ["dark", "light", "auto"],
      activeTheme: "auto",
      setTheme: (activeTheme: AppTheme) => set(() => ({ activeTheme })),
    }),
    {
      name: "active-theme",
      // storage: createJSONStorage(() => sessionStorage),
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => key === "activeTheme")
        ),
    }
  )
);
