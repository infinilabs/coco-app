import {
  Settings,
  LogOut,
  Command,
  User,
  Home,
  ChevronUp,
  ArrowDown01,
  AppWindowMac,
  ArrowDownUp,
  CornerDownLeft,
} from "lucide-react";
// import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
// import { Link } from "react-router-dom";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const shortcuts = [
  { label: "Quick open", keys: "Tab" },
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
      url: "/ui/settings",
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
      className="px-4 h-10 fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
      <div className="flex items-center">
        {
          name ? (
            <div className="flex gap-2 items-center text-[#666] text-xs">
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

      <div className="flex items-center gap-3">
        <div className="gap-1 flex items-center text-[#666] dark:text-[#666] text-sm">
          <span className="mr-1.5 ">Quick open</span>
          <Command className="w-5 h-5 p-1 border rounded-[6px] dark:text-[#666] dark:border-[rgba(255,255,255,0.15)]" />
          <ArrowDown01 className="w-5 h-5 p-1 border rounded-[6px] dark:text-[#666] dark:border-[rgba(255,255,255,0.15)]" />
        </div>
        <div className="flex items-center text-[#666] dark:text-[#666] text-sm">
          <span className="mr-1.5 ">Open</span>
          <CornerDownLeft className="w-5 h-5 p-1 border rounded-[6px] dark:text-[#666] dark:border-[rgba(255,255,255,0.15)]" />
        </div>
      </div>
    </div>
  );
};
