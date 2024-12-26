import React, { createContext, useContext, useEffect } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { AppTheme } from "../utils/tauri";
import { useThemeStore } from "../stores/themeStore";

interface ThemeContextType {
  theme: AppTheme;
  changeTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { activeTheme: theme, setTheme } = useThemeStore();

  async function switchTrayIcon(value: "dark" | "light") {
    await invoke("switch_tray_icon", { isDarkMode: value === "dark" });
  }

  useEffect(() => {
    // Apply theme class to document
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "auto") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      switchTrayIcon(systemTheme);
    } else {
      root.classList.add(theme);
      switchTrayIcon(theme);
    }
    if (isTauri()) getAppTheme();
  }, [theme]);

  const getAppTheme = async () => {
    const theme = await invoke("plugin:theme|get_theme");
    console.log("theme", theme);
  };

  const changeTheme = async (value: AppTheme) => {
    setTheme(value);
    if (isTauri()) {
      await invoke("plugin:theme|set_theme", {
        theme: value,
      }).catch((err) => {
        console.error(err);
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
