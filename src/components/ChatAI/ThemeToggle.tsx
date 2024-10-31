import { Switch } from "@headlessui/react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "../ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Switch
      checked={theme === "dark"}
      onChange={() => setTheme(theme === "light" ? "dark" : "light")}
      className={`${
        theme === "dark" ? "bg-indigo-500" : "bg-gray-200"
      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`${
          theme === "dark" ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      >
        {theme === "dark" ? (
          <Moon className="h-4 w-4 text-indigo-500" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </span>
    </Switch>
  );
}
