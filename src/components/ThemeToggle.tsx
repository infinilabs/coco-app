import { Sun, Moon } from "lucide-react";
import { setTheme as setAppTheme } from "@tauri-apps/api/app";

import { useTheme } from "./ThemeProvider";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const setThemeClick = async () => {
    const curTheme = theme === "light" ? "dark" : "light";
    setTheme(curTheme);
    await setAppTheme(curTheme);
  };

  return (
    <button
      onClick={() => setThemeClick()}
      className="inline-flex rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
    >
      <Sun
        size={20}
        className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
      />
      <Moon
        size={20}
        className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
      />
    </button>
  );
};

export default ThemeToggle;
