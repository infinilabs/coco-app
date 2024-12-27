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

  // Get the effective theme (considering auto mode)
  const getEffectiveTheme = (): "light" | "dark" => {
    if (theme === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme as "light" | "dark";
  };

  // Unified theme update function
  const updateTheme = async (newTheme: AppTheme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    // Determine the actual theme to apply
    const effectiveTheme = newTheme === "auto" ? getEffectiveTheme() : newTheme;
    root.classList.add(effectiveTheme);

    // Update tray icon
    await switchTrayIcon(effectiveTheme);

    if (isTauri()) {
      await invoke("plugin:theme|set_theme", {
        theme: effectiveTheme,
      }).catch((err) => {
        console.error("Failed to update theme:", err);
      });
    }
  };

  // Handle system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleThemeChange = async (e: MediaQueryListEvent) => {
      // Only follow system theme when set to auto
      if (theme === "auto") {
        const systemTheme = e.matches ? "dark" : "light";
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(systemTheme);
        
        // Update tray icon to match system theme
        await switchTrayIcon(systemTheme);
      }
    };

    // Add system theme change listener
    mediaQuery.addEventListener("change", handleThemeChange);

    // Initialize theme on component mount
    const initTheme = async () => {
      const effectiveTheme = getEffectiveTheme();
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
      
      // Initialize tray icon
      await switchTrayIcon(effectiveTheme);
    };

    initTheme();

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [theme]); // Re-run effect when theme changes

  // Handle manual theme changes
  const changeTheme = async (newTheme: AppTheme) => {
    setTheme(newTheme);
    await updateTheme(newTheme);
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
