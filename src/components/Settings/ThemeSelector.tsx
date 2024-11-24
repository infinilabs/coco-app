import { useContext } from "react";
import { Menu } from "@headlessui/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Theme, ThemeContext } from "./index2";

const ThemeSelector = () => {
  const { theme, setTheme } = useContext(ThemeContext);

  const themes: { value: Theme; label: string; icon: any }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const currentTheme = themes.find((t) => t.value === theme);

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        {currentTheme && <currentTheme.icon className="w-4 h-4" />}
        <span>{currentTheme?.label}</span>
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="p-1">
          {themes.map((item) => (
            <Menu.Item key={item.value}>
              {({ active }) => (
                <button
                  onClick={() => setTheme(item.value)}
                  className={`${
                    active
                      ? "bg-gray-100 dark:bg-gray-700"
                      : "text-gray-900 dark:text-gray-100"
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </button>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  );
};

export default ThemeSelector;
