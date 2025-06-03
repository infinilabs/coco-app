import { Menu, MenuButton } from "@headlessui/react";

import logoImg from "@/assets/icon.svg";

const Footer = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 h-8 flex items-center justify-between">
        <Menu as="div" className="relative">
          <MenuButton className="h-7 flex items-center space-x-2 px-1 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <img
              src={logoImg}
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Coco
            </span>
            {/* <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" /> */}
          </MenuButton>

          {/* <MenuItems className="absolute bottom-full mb-2 left-0 w-64 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
          </MenuItems> */}
        </Menu>

        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Version {process.env.VERSION || "v1.0.0"}
          </span>
          {/* <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            Check for Updates
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default Footer;
