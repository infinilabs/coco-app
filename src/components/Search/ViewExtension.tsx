/*
 * ViewExtension.tsx
 *
 * View that will be rendered when opening a View extension.
 * 
 */

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchStore } from "@/stores/searchStore";
import { convertFileSrc, invoke } from "@tauri-apps/api/core"; 

const ViewExtension: React.FC = () => {
  const { setViewExtensionOpened, viewExtensionOpened } = useSearchStore();
  const [pagePath, setPagePath] = useState<string>("");
  const [apis, setApis] = useState<Map<string, string[]> | null>(null);

  if (viewExtensionOpened == null) {
    // When this view gets loaded, this state should not be NULL.
    throw new Error(
      "ViewExtension Error: viewExtensionOpened is null. This should not happen."
    );
  }

  // Tauri/webview is not allowed to access local files directly,
  // use convertFileSrc to work around the issue.
  useEffect(() => {
    const setupFileUrl = async () => {
      // The check above ensures viewExtensionOpened is not null here.
      const filePath = viewExtensionOpened[0];
      if (filePath) {
        setPagePath(convertFileSrc(filePath));
      }
    };

    setupFileUrl();
  }, [viewExtensionOpened]);

  useEffect(() => {
    const fetchApis = async () => {
      try {
        const availableApis = await invoke("apis") as Record<string, string[]>;
        setApis(new Map(Object.entries(availableApis)));
      } catch (error) {
        console.error("Failed to fetch APIs:", error);
      }
    };

    fetchApis();
  }, []);

  const handleBack = () => {
    setViewExtensionOpened(null);
  };

  // Allowed API categories from the extension's manifest.
  const apiPermissions = viewExtensionOpened[1];

  // apis is in format {"category": ["api1", "api2"]}, to make the permission check
  // easier, reverse the map key values: {"api1": "category", "api2": "category"}
  const reversedApis = useMemo(() => {
    if (apis == null) {
      return null; // Return null instead of throwing error when apis is not ready
    }

    const reversed = new Map<string, string>();
    for (const [category, apiArray] of apis.entries()) {
      for (const api of apiArray) {
        reversed.set(api, category);
      }
    }
    return reversed;
  }, [apis]);

  // Watch for events from iframes - only set up listener when reversedApis is ready
  useEffect(() => {
    // Don't set up the listener if reversedApis is not ready yet
    if (!reversedApis) {
      return;
    }

    // Also check if apiPermissions is available and is an array
    if (!apiPermissions || !Array.isArray(apiPermissions)) {
      console.warn('apiPermissions is not available or not an array:', apiPermissions);
      return;
    }

    const messageHandler = async (event: MessageEvent) => {
      if (
        event.source != null &&
        typeof (event.source as any).postMessage === "function"
      ) {
        const source = event.source as Window;
        const { id, command } = event.data;

        // 1. Check if the command is a known API
        if (!reversedApis.has(command)) {
          source.postMessage(
            {
              id,
              payload: null,
              error: `Error: Command '${command}' is not a valid API.`,
            },
            event.origin
          );
          return;
        }

        // 2. Check if the extension has permission for this API's category
        const category = reversedApis.get(command)!;
        
        if (!apiPermissions.includes(category)) {
          source.postMessage(
            {
              id,
              payload: null,
              error: `Permission Denied: Command '${command}' requires permission for category '${category}', which was not granted to this extension.`,
            },
            event.origin
          );
          return;
        }

        // If permission is granted, execute the command
        if (command === "readDir") {
          const { path } = event.data;
          try {
            const fileNames: [String] = await invoke("readDir", { path: path });
            source.postMessage(
              {
                id,
                payload: fileNames,
                error: null,
              },
              event.origin
            );
          } catch (e) {
            source.postMessage(
              {
                id,
                payload: null,
                error: e,
              },
              event.origin
            );
          }
        }
      }
    };
    window.addEventListener("message", messageHandler);
    console.info("Coco extension API listener is up");

    return () => {
        window.removeEventListener('message', messageHandler);
    };
  }, [reversedApis, apiPermissions]); // Add apiPermissions as dependency

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
          src={pagePath}
          title="iframe Example 1"
          className="w-full h-full border-0"
        >
        </iframe>
      </div>
    </div>
  );
};

export default ViewExtension;
