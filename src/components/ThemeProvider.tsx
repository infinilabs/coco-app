import { createContext, useContext, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    // Load the theme from storage or set to default
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    }

    let unlistenThemeChanges: (() => void) | undefined;

    const setupThemeListener = async () => {
      unlistenThemeChanges = await listenForThemeChanges();
    };

    setupThemeListener();

    return () => {
      // Cleanup listeners on unmount
      unlistenThemeChanges?.();
    };
  }, [storageKey]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Apply the theme to the document root
  const applyTheme = (currentTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    const finalTheme =
      currentTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : currentTheme;

    root.classList.add(finalTheme);
  };

  const listenForThemeChanges = async () => {
    if (isTauri()) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");

      const currentWindow = getCurrentWindow();

      const systemTheme = await currentWindow.theme();
      console.log("Current theme (Tauri):", systemTheme);
      if (theme === "system") {
        applyTheme(systemTheme as Theme);
      }

      const unlisten = await currentWindow.onThemeChanged(
        ({ payload: newTheme }) => {
          if (theme === "system") {
            applyTheme(newTheme as Theme);
            console.log("New theme (Tauri):", newTheme);
          }
        }
      );

      return () => {
        unlisten();
      };
    } else {
      const matchMediaDark = window.matchMedia("(prefers-color-scheme: dark)");

      const systemTheme = matchMediaDark.matches ? "dark" : "light";
      console.log("Current theme (Web):", systemTheme);
      if (theme === "system") {
        applyTheme(systemTheme as Theme);
      }

      const handleThemeChange = (e: MediaQueryListEvent) => {
        if (theme === "system") {
          applyTheme(e.matches ? "dark" : "light");
          console.log("New theme (Web):", e.matches ? "dark" : "light");
        }
      };

      matchMediaDark.addEventListener("change", handleThemeChange);

      return () => {
        matchMediaDark.removeEventListener("change", handleThemeChange);
      };
    }
  };

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const contextValue = { theme, setTheme };

  return (
    <ThemeProviderContext.Provider value={contextValue}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
