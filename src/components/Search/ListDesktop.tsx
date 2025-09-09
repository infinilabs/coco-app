/*
 * ListDesktop.tsx
 *
 * View that will be rendered when users choose the "List ~/Desktop" entry.
 */

import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchStore } from "@/stores/searchStore";
import { convertFileSrc } from "@tauri-apps/api/core"; 

const ListDesktop: React.FC = () => {
  const { setVisibleListDesktop } = useSearchStore();
  const [fileUrl, setFileUrl] = useState<string>("");

  // Tauri/webview is not allowed to access local files directly, 
  // use convertFileSrc to work around the issue.
  useEffect(() => {
      const setupFileUrl = async () => {
        const filePath = `/Users/steve/Desktop/index.html`;
        
        setFileUrl(convertFileSrc(filePath));
      };

      setupFileUrl();
    }, []); // 空依赖数组确保只运行一次

  const handleBack = () => {
    setVisibleListDesktop(false);
  };

  return (
    <div className="h-full w-full flex flex-col">
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
      <div className="flex-1">
        <iframe
          src={fileUrl}
          title="iframe Example 1"
          className="w-full h-full border-0"
        >
        </iframe>
      </div>
    </div>
  );
};

export default ListDesktop;
