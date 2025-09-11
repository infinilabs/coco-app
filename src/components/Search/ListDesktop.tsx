/*
 * ListDesktop.tsx
 *
 * View that will be rendered when users choose the "List ~/Desktop" entry.
 * 
 * arguments: 
 *  1. path to the page to load
 *  2. Allowed APIs, e.g., clipboard
 */

import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchStore } from "@/stores/searchStore";
import { convertFileSrc, invoke } from "@tauri-apps/api/core"; 

const ListDesktop: React.FC = () => {
  const { setVisibleListDesktop } = useSearchStore();
  const [extensionHtmlPath, setExtensionHtmlPath] = useState<string>("");

  // Tauri/webview is not allowed to access local files directly, 
  // use convertFileSrc to work around the issue.
  useEffect(() => {
      const setupFileUrl = async () => {
        const filePath = '/Users/steve/Documents/workspace/INFINI/coco-app/example_extensions/list_desktop/dist/index.html';
        // const filePath = '/Users/steve/Documents/workspace/INFINI/coco-app/example_extensions/simple_html.html';

        console.log(filePath);
        
        setExtensionHtmlPath(convertFileSrc(filePath));
      };

      setupFileUrl();
    }, []); 

  const handleBack = () => {
    setVisibleListDesktop(false);
  };

  // Watch for events from iframes
  useEffect(() => {
    const messageHandler = async (event: MessageEvent) => {
        if (event.source != null && typeof (event.source as any).postMessage === 'function') {
          const source = event.source as Window;
          const {id, command} = event.data;

          if (command === 'readDir') {
              const { path } = event.data;
              try {
                  const fileNames: [String] = await invoke('readDir', { path: path });
                  source.postMessage({
                      id,
                      payload: fileNames,
                      error: null
                  }, event.origin);
              } catch (e) {
                  source.postMessage({
                      id,
                      payload: null,
                      error: e
                  }, event.origin);
              }
              
          }
        }
    };
    window.addEventListener('message', messageHandler);
    console.log("DBG: Coco event listener set up");

    return () => {
        window.removeEventListener('message', messageHandler);
    };
  }, []);

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
          src={extensionHtmlPath}
          title="iframe Example 1"
          className="w-full h-full border-0"
        >
        </iframe>
      </div>
    </div>
  );
};

export default ListDesktop;
