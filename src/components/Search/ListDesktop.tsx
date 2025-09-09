/*
 * ListDesktop.tsx
 *
 * View that will be rendered when users choose the "List ~/Desktop" entry.
 */

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchStore } from "@/stores/searchStore";

const ListDesktop: React.FC = () => {
  const { setVisibleListDesktop } = useSearchStore();

  const handleBack = () => {
    setVisibleListDesktop(false);
  };

  return (
    <div className="h-full w-full">
      {/* Header with back button */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft size={20} />
          <span>Back to Search</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center flex-1 p-8">
        <div className="text-center">
          <iframe
            src="https://www.baidu.com"
            title="iframe Example 1"
            width="400"
            height="300"
            className="border border-gray-300 dark:border-gray-600 rounded-md"
          >
          </iframe>
        </div>
      </div>
    </div>
  );
};

export default ListDesktop;
