import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ITheme = "dark" | "light" | "system";

export type IThemeStore = {
  themes: ITheme[];
  activeTheme: ITheme;
  setTheme: (theme: ITheme) => void;
};

export const useThemeStore = create<IThemeStore>()(
  persist(
    (set) => ({
      themes: ["dark", "light", "system"],
      activeTheme: "system",
      setTheme: (activeTheme: ITheme) => set(() => ({ activeTheme })),
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
