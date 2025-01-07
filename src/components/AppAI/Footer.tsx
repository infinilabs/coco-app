import {
  Command,
  ArrowDown01,
  AppWindowMac,
  CornerDownLeft,
} from "lucide-react";

import logoImg from "@/assets/32x32.png";

interface FooterProps {
  isChat: boolean;
  name?: string;
}

export default function Footer({ name }: FooterProps) {
  return (
    <div
      data-tauri-drag-region
      className="px-4 z-999 mx-[1px] h-10 absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
      <div className="flex items-center">
        <div className="flex items-center space-x-4">
          <img src={logoImg} className="w-5 h-5" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Version 1.0.0
          </span>
        </div>

        {name ? (
          <div className="flex gap-2 items-center text-[#666] text-xs">
            <AppWindowMac className="w-5 h-5" /> {name}
          </div>
        ) : null}
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
}
