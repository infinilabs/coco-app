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
import { ExtensionFileSystemPermission, FileSystemAccess } from "../Settings/Extensions";

const ViewExtension: React.FC = () => {
  const { setViewExtensionOpened, viewExtensionOpened } = useSearchStore();
  const [pagePath, setPagePath] = useState<string>("");
  // Complete list of the backend APIs, grouped by their category.
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

  // invoke `apis()` and set the state
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

  // White list of the permission entries
  const permission = viewExtensionOpened[1];

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

    const messageHandler = async (event: MessageEvent) => {
      if (
        event.source != null &&
        typeof (event.source as any).postMessage === "function"
      ) {
        const source = event.source as Window;
        const { id, command } = event.data;

        // 1. Check if the command exists
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

        // 2. Check if the extension has permission to call this API
        const category = reversedApis.get(command)!;
        var api = null;
        if (permission == null) {
          api = null
        } else {
          api = permission.api
        };
        if (!apiPermissionCheck(category, command, api)) {
          source.postMessage(
            {
              id,
              payload: null,
              error: `Error: permission denied, API ${command} is unavailable`,
            },
            event.origin
          );
          return;
        }

        var fs = null;
        if (permission == null) {
          fs = null
        } else {
          fs = permission.fs
        };
        if (!(await fsPermissionCheck(command, event.data, fs))) {
          source.postMessage(
            {
              id,
              payload: null,
              error: `Error: permission denied`,
            },
            event.origin
          );
          return;
        }

        if (command === "read_dir") {
          const { path } = event.data;
          try {
            const fileNames: [String] = await invoke("read_dir", { path: path });
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
  }, [reversedApis, permission]); // Add apiPermissions as dependency

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
          className="w-full h-full border-0"
        >
        </iframe>
      </div>
    </div>
  );
};

export default ViewExtension;


// Permission check function - TypeScript translation of Rust function
const apiPermissionCheck = (category: string, api: string, allowedApis: string[] | null): boolean => {
  if (!allowedApis) {
    return false;
  }

  const qualifiedApi = `${category}:${api}`;
  return allowedApis.some(a => a === qualifiedApi);
};

const extractFsAccessPattern = (command: string, requestPayload: any): [string, FileSystemAccess] => {
  switch (command) {
    case "read_dir": {
       const { path } = requestPayload;

       return [path, ["read"]];
    }
    default: {
      throw new Error(`unknown command ${command}`); 
    }
  }
}

const fsPermissionCheck = async (command: string, requestPayload: any, fsPermission: ExtensionFileSystemPermission[] | null): Promise<boolean> => {
  if (!fsPermission) {
    return false;
  }

  const [ path, access ] = extractFsAccessPattern(command, requestPayload); 
  const clean_path = await invoke("path_absolute", { path: path });

  // Walk through fsPermission array to find matching paths
  for (const permission of fsPermission) {
    if (permission.path === clean_path) {
      // Check if all required access permissions are included in the permission's access array
      const hasAllRequiredAccess = access.every(requiredAccess => 
        permission.access.includes(requiredAccess)
      );
      
      if (hasAllRequiredAccess) {
        return true;
      }
    }
  }

  return false;
}