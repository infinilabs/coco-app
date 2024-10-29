import React from "react";
import { Settings, LogOut, Command, User, Home, ChevronUp } from "lucide-react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { Link } from "react-router-dom";

const shortcuts = [
  { label: "翻页/换行", keys: "↓" },
  { label: "快速换行", keys: "Tab" },
  { label: "Talk to AI", keys: "⌘ + /" },
  { label: "Open", keys: "⌘ + O" },
];

export const Footer: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 h-12 flex items-center justify-between">
      <div className="flex items-center">
        <Menu as="div" className="relative">
          <MenuButton className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Command className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Coco
            </span>
            <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </MenuButton>

          <MenuItems className="absolute bottom-full mb-2 left-0 w-64 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="p-1">
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`${
                      active
                        ? "bg-gray-100 dark:bg-gray-700"
                        : "text-gray-900 dark:text-gray-100"
                    } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    <Link to={`/`}>Home</Link>
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`${
                      active
                        ? "bg-gray-100 dark:bg-gray-700"
                        : "text-gray-900 dark:text-gray-100"
                    } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`${
                      active
                        ? "bg-gray-100 dark:bg-gray-700"
                        : "text-gray-900 dark:text-gray-100"
                    } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    <Link to={`settings`}>Settings</Link>
                  </button>
                )}
              </MenuItem>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`${
                      active
                        ? "bg-gray-100 dark:bg-gray-700"
                        : "text-gray-900 dark:text-gray-100"
                    } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                )}
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
      </div>

      <div className="flex items-center gap-4">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center text-gray-500 dark:text-gray-400 text-sm"
          >
            {index > 0 && (
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mr-4" />
            )}
            <span className="mr-1.5">{shortcut.label}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium">
              {shortcut.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
};
