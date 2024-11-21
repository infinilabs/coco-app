import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

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

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

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

  // Listen for system theme changes using Tauri APIs
  const listenForThemeChanges = async () => {
    const currentWindow = getCurrentWindow();

    // Initial system theme setup
    const systemTheme = await currentWindow.theme();
    console.log("Cur theme: " + theme);
    if (theme === "system") {
      applyTheme(systemTheme as Theme);
    }

    // Listen for theme changes
    const unlisten = await currentWindow.onThemeChanged(({ payload: newTheme }) => {
      if (theme === "system") {
        applyTheme(newTheme as Theme);
        console.log("New theme: " + theme);
      }
    });

    return () => {
      unlisten();
    };
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
