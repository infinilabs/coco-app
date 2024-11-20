import {
  Settings,
  LogOut,
  Command,
  User,
  Home,
  ChevronUp,
  AppWindowMac,
  ArrowDownUp,
  CornerDownLeft,
} from "lucide-react";
// import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
// import { Link } from "react-router-dom";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const shortcuts = [
  { label: "Page turn/line break", keys: "ArrowDownUp" },
  { label: "Quick line selection", keys: "Tab" },
  { label: "Open", keys: "CornerDownLeft" },
];

const isChatShortcuts = [
  { label: "Go to Search", keys: "⌘ + /" },
  { label: "Open", keys: "⌘ + O" },
];

interface FooterProps {
  isChat: boolean;
  name?: string;
}

export const Footer = ({ isChat, name }: FooterProps) => {
  async function openWebviewWindowSettings() {
    const webview = new WebviewWindow("settings", {
      title: "Coco Settings",
      dragDropEnabled: true,
      center: true,
      width: 900,
      height: 700,
      alwaysOnTop: true,
      skipTaskbar: true,
      decorations: true,
      closable: true,
      url: "/settings",
    });
    webview.once("tauri://created", function () {
      console.log("webview created");
    });
    webview.once("tauri://error", function (e) {
      console.log("error creating webview", e);
    });
  }

  return (
    <div
      style={{ zIndex: 999 }}
      className="px-4 h-12 fixed bottom-1 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
      <div className="flex items-center">
        {
          name ? (
            <div className="flex gap-2 items-center text-[#666] text-3">
              <AppWindowMac className="w-5 h-5" /> {name}
            </div>
          ) : null
          // <Menu as="div" className="relative">
          //   <MenuButton className="h-7 flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          //     <Command className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          //     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          //       Coco
          //     </span>
          //     <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          //   </MenuButton>

          //   <MenuItems className="absolute bottom-full mb-2 left-0 w-64 rounded-lg bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          //     <div className="p-1">
          //       <MenuItem>
          //         {({ active }) => (
          //           <button
          //             className={`${
          //               active
          //                 ? "bg-gray-100 dark:bg-gray-700"
          //                 : "text-gray-900 dark:text-gray-100"
          //             } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
          //           >
          //             <Home className="w-4 h-4 mr-2" />
          //             <Link to={`/`}>Home</Link>
          //           </button>
          //         )}
          //       </MenuItem>
          //       {/* <MenuItem>
          //       {({ active }) => (
          //         <button
          //           className={`${
          //             active
          //               ? "bg-gray-100 dark:bg-gray-700"
          //               : "text-gray-900 dark:text-gray-100"
          //           } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
          //         >
          //           <User className="w-4 h-4 mr-2" />
          //           Profile
          //         </button>
          //       )}
          //     </MenuItem> */}
          //       <MenuItem>
          //         {({ active }) => (
          //           <button
          //             className={`${
          //               active
          //                 ? "bg-gray-100 dark:bg-gray-700"
          //                 : "text-gray-900 dark:text-gray-100"
          //             } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
          //             onClick={openWebviewWindowSettings}
          //           >
          //             <Settings className="w-4 h-4 mr-2" />
          //             Settings
          //           </button>
          //         )}
          //       </MenuItem>
          //       {/* <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          //     <MenuItem>
          //       {({ active }) => (
          //         <button
          //           className={`${
          //             active
          //               ? "bg-gray-100 dark:bg-gray-700"
          //               : "text-gray-900 dark:text-gray-100"
          //           } group flex w-full items-center rounded-md px-3 py-2 text-sm`}
          //         >
          //           <LogOut className="w-4 h-4 mr-2" />
          //           Sign Out
          //         </button>
          //       )}
          //     </MenuItem> */}
          //     </div>
          //   </MenuItems>
          // </Menu>
        }
      </div>

      <div className="flex items-center gap-2.5">
        {(isChat ? isChatShortcuts : shortcuts).map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center text-[#999] dark:text-gray-400 text-xs"
          >
            <span className="mr-1.5">{shortcut.label}</span>
            {shortcut.keys === "Tab" ? (
              <Command className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium" />
            ) : null}
            {shortcut.keys === "ArrowDownUp" || shortcut.keys === "Tab" ? (
              <ArrowDownUp className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium" />
            ) : null}
            {shortcut.keys === "CornerDownLeft" ? (
              <CornerDownLeft className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
