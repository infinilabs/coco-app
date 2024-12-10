import { isTauri } from "@tauri-apps/api/core";
import { Command } from "lucide-react";

import WebSearch from "../../components/SearchChat/WebSearch"

console.log("isTauri", isTauri());

function WebApp() {
  return (
    <div className="h-[100%] w-[100%]">
      <div className="mx-auto px-4 py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
            <Command className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600">Press</span>
            <kbd className="px-2 py-1 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-md">
              ⌘
            </kbd>
            <kbd className="px-2 py-1 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-md">
              K
            </kbd>
            <span className="text-gray-600">to open command palette</span>
          </div>
        </div>
      </div>

      <WebSearch />
    </div>
  );
}

export default WebApp;
