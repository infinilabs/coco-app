import React, {createContext, useCallback, useContext, useEffect, useState,} from "react";
import {invoke, isTauri} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {emit, listen} from "@tauri-apps/api/event";
import {AppTheme, WindowTheme} from "../utils/tauri";
import {useThemeStore} from "../stores/themeStore";

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

export function ThemeProvider({children}: { children: React.ReactNode }) {
    const {activeTheme: theme, setTheme} = useThemeStore();

    const [windowTheme, setWindowTheme] = useState<WindowTheme>("light");

    // Keep track of the last applied theme to prevent redundant updates
    const [lastAppliedTheme, setLastAppliedTheme] = useState<WindowTheme>("light");

    useEffect(() => {
        const initTheme = async () => {
            const displayTheme = getDisplayTheme(theme);
            await applyTheme(displayTheme);
        };
        initTheme();

        if (!isTauri()) return;

        let unlisten: (() => void) | undefined;
        const setupThemeListener = async () => {
            const currentWindow = getCurrentWindow();
            unlisten = await currentWindow.onThemeChanged(({payload: w_theme}) => {
                console.log("window New theme:", w_theme);
                setWindowTheme(w_theme);
                if (theme === "auto") applyTheme(w_theme);
            });
        };
        setupThemeListener();

        return () => {
            unlisten?.();
        };
    }, [theme]);

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

        root.setAttribute("data-theme", displayTheme);
    };

    // Apply theme to UI and sync with Tauri
    const applyTheme = async (displayTheme: WindowTheme) => {
        // Only apply if the theme is different from the last applied theme
        if (displayTheme === lastAppliedTheme) return;

        // Update DOM
        changeClassTheme(displayTheme);

        // Sync with Tauri
        if (isTauri()) {
            console.log("Applying theme to Tauri:", displayTheme);
            try {
                await invoke("plugin:theme|set_theme", {theme: displayTheme});
                setLastAppliedTheme(displayTheme); // Update the last applied theme
            } catch (err) {
                console.error("Failed to update window theme:", err);
            }

            // Notify other windows to update the theme
            try {
                console.log("emit theme-changed", displayTheme);
                await emit("theme-changed", {theme: displayTheme});
            } catch (err) {
                console.error("Failed to emit theme-changed event:", err);
            }
        } else {
            console.log("Not Tauri, skip apply theme");
        }
    };

    // Handle system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleSystemThemeChange = async () => {
            if (theme === "auto") {
                const displayTheme = windowTheme;
                await applyTheme(displayTheme);
            }
        };

        mediaQuery.addEventListener("change", handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener("change", handleSystemThemeChange);
        };
    }, [theme, windowTheme]);

    // Handle user theme change
    const changeTheme = async (newTheme: AppTheme) => {
        setTheme(newTheme);
        const displayTheme = getDisplayTheme(newTheme);
        console.log("Theme changed to:", newTheme, ",", displayTheme);
        await applyTheme(displayTheme);
    };

    useEffect(() => {
        let unlisten: () => void;

        const setupListener = async () => {
            unlisten = await listen("theme-changed", (event: any) => {
                console.log("Theme updated to:", event.payload);
                changeClassTheme(event.payload.theme);
            });
        };

        setupListener();

        return () => {
            unlisten?.();
        };
    }, []);

    return (
        <ThemeContext.Provider value={{theme, changeTheme}}>
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