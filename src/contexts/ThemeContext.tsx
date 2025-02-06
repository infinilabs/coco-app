import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";

import { AppTheme, WindowTheme } from "../utils/tauri";
import { useThemeStore } from "../stores/themeStore";

interface ThemeContextType {
  theme: AppTheme;
  changeTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  changeTheme: () => {
    throw new Error("changeTheme not implemented");
  },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { activeTheme: theme, setTheme } = useThemeStore();

  const [windowTheme, setWindowTheme] = useState<WindowTheme>("light");

  useEffect(() => {
    // Initial theme setup
    const initTheme = async () => {
      const displayTheme = getDisplayTheme(theme);
      await applyTheme(displayTheme);
    };
    initTheme();
    //
    if (!isTauri()) return;
    // window theme
    let unlisten: (() => void) | undefined;
    const setupThemeListener = async () => {
      const currentWindow = getCurrentWindow();
      unlisten = await currentWindow.onThemeChanged(({ payload: w_theme }) => {
        console.log("window New theme:", w_theme);
        setWindowTheme(w_theme);
        // Update tray icon
        switchTrayIcon(w_theme);
        if (theme === "auto") applyTheme(w_theme);
      });
    };
    setupThemeListener();

    return () => {
      unlisten?.();
    };
  }, [theme]);

  async function switchTrayIcon(value: "dark" | "light") {
    try {
      await invoke("switch_tray_icon", { isDarkMode: value === "dark" });
    } catch (err) {
      console.error("Failed to switch tray icon:", err);
    }
  }

  // Get the actual theme to display based on user settings and system theme
  const getDisplayTheme = useCallback(
    (userTheme: AppTheme): WindowTheme => {
      return userTheme === "auto" ? windowTheme : userTheme;
    },
    [windowTheme]
  );

  const changeClassTheme = (displayTheme: WindowTheme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(displayTheme);
    //
    root.setAttribute("data-theme", displayTheme);
  }

  // Apply theme to UI and sync with Tauri
  const applyTheme = async (displayTheme: WindowTheme) => {
    // Update DOM
    changeClassTheme(displayTheme)

    // Sync with Tauri
    if (isTauri()) {
      // Update window theme
      try {
        await invoke("plugin:theme|set_theme", { theme: displayTheme });
      } catch (err) {
        console.error("Failed to update window theme:", err);
      }

      // Notify other windows to update the theme
      try {
        console.log("theme-changed", displayTheme);
        await emit("theme-changed", { theme: displayTheme });
      } catch (err) {
        console.error("Failed to emit theme-changed event:", err);
      }
    }
  };

  // Initialize theme and handle system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = async () => {
      // Only update if user setting is 'auto'
      if (theme === "auto") {
        const displayTheme = windowTheme;
        await applyTheme(displayTheme);
      }
    };

    // Add system theme change listener
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Cleanup listener on unmount
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme, windowTheme]); // Re-run when user theme setting changes

  // Handle theme changes from user interaction
  const changeTheme = async (newTheme: AppTheme) => {
    console.log("Theme changed to:", newTheme);
    setTheme(newTheme);
    const displayTheme = getDisplayTheme(newTheme);
    await applyTheme(displayTheme);
  };

  useEffect(() => {
    let unlisten: () => void;

    const setupListener = async () => {
      unlisten = await listen("theme-changed", (event: any) => {
        console.log("Theme updated to:", event.payload);
        changeClassTheme(event.payload.theme)
      });
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, []);

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
