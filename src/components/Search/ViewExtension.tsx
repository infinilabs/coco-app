import React from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2 } from "lucide-react";

import { useSearchStore } from "@/stores/searchStore";
import {
  ExtensionFileSystemPermission,
  FileSystemAccess,
  ViewExtensionUISettings,
} from "../Settings/Extensions";
import platformAdapter from "@/utils/platformAdapter";
import { useShortcutsStore } from "@/stores/shortcutsStore";

const ViewExtension: React.FC = () => {
  const { viewExtensionOpened } = useSearchStore();
  // Complete list of the backend APIs, grouped by their category.
  const [apis, setApis] = useState<Map<string, string[]> | null>(null);
  const { setModifierKeyPressed } = useShortcutsStore();
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevWindowRef = useRef<{
    width: number;
    height: number;
    resizable: boolean;
    x: number;
    y: number;
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const DEFAULT_VIEW_WIDTH = 1200;
  const DEFAULT_VIEW_HEIGHT = 900;

  if (viewExtensionOpened == null) {
    // When this view gets loaded, this state should not be NULL.
    throw new Error(
      "ViewExtension Error: viewExtensionOpened is null. This should not happen."
    );
  }

  // invoke `apis()` and set the state
  useEffect(() => {
    setModifierKeyPressed(false);

    const fetchApis = async () => {
      try {
        const availableApis = (await platformAdapter.invokeBackend(
          "apis"
        )) as Record<string, string[]>;
        setApis(new Map(Object.entries(availableApis)));
      } catch (error) {
        console.error("Failed to fetch APIs:", error);
      }
    };

    fetchApis();
  }, []);

  // White list of the permission entries
  const permission = viewExtensionOpened[3];

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
          api = null;
        } else {
          api = permission.api;
        }
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
          fs = null;
        } else {
          fs = permission.fs;
        }
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
            const fileNames: [String] = await platformAdapter.invokeBackend(
              "read_dir",
              {
                path: path,
              }
            );
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
      window.removeEventListener("message", messageHandler);
    };
  }, [reversedApis, permission]); // Add apiPermissions as dependency

  const fileUrl = viewExtensionOpened[2];
  const ui: ViewExtensionUISettings = useMemo(() => {
    return {
      detachable: false,
      filter_bar: false,
      footer: false,
      height: 800,
      resizable: true,
      search_bar: false,
      width: 1000,
    };
  }, []);
  const resizable = ui?.resizable === true;
  const applyFullscreen = useCallback(
    async (next: boolean) => {
      if (next) {
        await platformAdapter.setWindowResizable(true);
        const maxWidth = window.screen.availWidth;
        const maxHeight = window.screen.availHeight;
        await platformAdapter.setWindowSize(maxWidth, maxHeight);
        await platformAdapter.setWindowPosition(0, 0);
      } else {
        const nextWidth =
          ui && typeof ui.width === "number" ? ui.width : DEFAULT_VIEW_WIDTH;
        const nextHeight =
          ui && typeof ui.height === "number" ? ui.height : DEFAULT_VIEW_HEIGHT;
        const nextResizable =
          ui && typeof ui.resizable === "boolean" ? ui.resizable : true;
        await platformAdapter.setWindowSize(nextWidth, nextHeight);
        await platformAdapter.setWindowResizable(nextResizable);
        if (prevWindowRef.current) {
          await platformAdapter.setWindowPosition(
            prevWindowRef.current.x,
            prevWindowRef.current.y
          );
        } else {
          await platformAdapter.centerWindow();
        }
      }
    },
    [ui]
  );
  useEffect(() => {
    const applyWindowSettings = async () => {
      if (viewExtensionOpened != null) {
        const size = await platformAdapter.getWindowSize();
        const resizable = await platformAdapter.isWindowResizable();
        const pos = await platformAdapter.getWindowPosition();
        prevWindowRef.current = {
          width: size.width,
          height: size.height,
          resizable,
          x: pos.x,
          y: pos.y,
        };

        const nextWidth =
          ui && typeof ui.width === "number" ? ui.width : DEFAULT_VIEW_WIDTH;
        const nextHeight =
          ui && typeof ui.height === "number" ? ui.height : DEFAULT_VIEW_HEIGHT;
        const nextResizable =
          ui && typeof ui.resizable === "boolean" ? ui.resizable : true;

        await platformAdapter.setWindowSize(nextWidth, nextHeight);
        await platformAdapter.setWindowResizable(nextResizable);
        await platformAdapter.centerWindow();
      } else {
        if (prevWindowRef.current) {
          const prev = prevWindowRef.current;
          await platformAdapter.setWindowSize(prev.width, prev.height);
          await platformAdapter.setWindowResizable(prev.resizable);
          await platformAdapter.setWindowPosition(prev.x, prev.y);
          prevWindowRef.current = null;
        }
      }
    };

    applyWindowSettings();
    return () => {
      if (prevWindowRef.current) {
        const prev = prevWindowRef.current;
        platformAdapter.setWindowSize(prev.width, prev.height);
        platformAdapter.setWindowResizable(prev.resizable);
        platformAdapter.setWindowPosition(prev.x, prev.y);
        prevWindowRef.current = null;
      }
    };
  }, [viewExtensionOpened]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        applyFullscreen(false);
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true } as any);
    };
  }, [isFullscreen, applyFullscreen]);

  return (
    <div className="relative w-full h-full">
      {resizable && (
        <button
          aria-label={isFullscreen ? t("viewExtension.fullscreen.exit") : t("viewExtension.fullscreen.enter")}
          className="absolute top-2 right-2 z-10 rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
          onClick={async () => {
            const next = !isFullscreen;
            await applyFullscreen(next);
            setIsFullscreen(next);
          }}
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      )}
      <iframe
        ref={iframeRef}
        src={fileUrl}
        className="w-full h-full border-0"
        onLoad={(event) => {
          event.currentTarget.focus();
        }}
      />
    </div>
  );
};

export default ViewExtension;

// Permission check function - TypeScript translation of Rust function
const apiPermissionCheck = (
  category: string,
  api: string,
  allowedApis: string[] | null
): boolean => {
  if (!allowedApis) {
    return false;
  }

  const qualifiedApi = `${category}:${api}`;
  return allowedApis.some((a) => a === qualifiedApi);
};

const extractFsAccessPattern = (
  command: string,
  requestPayload: any
): [string, FileSystemAccess] => {
  switch (command) {
    case "read_dir": {
      const { path } = requestPayload;

      return [path, ["read"]];
    }
    default: {
      throw new Error(`unknown command ${command}`);
    }
  }
};

const fsPermissionCheck = async (
  command: string,
  requestPayload: any,
  fsPermission: ExtensionFileSystemPermission[] | null
): Promise<boolean> => {
  if (!fsPermission) {
    return false;
  }

  const [path, access] = extractFsAccessPattern(command, requestPayload);
  const clean_path = await platformAdapter.invokeBackend("path_absolute", {
    path: path,
  });

  // Walk through fsPermission array to find matching paths
  for (const permission of fsPermission) {
    if (permission.path === clean_path) {
      // Check if all required access permissions are included in the permission's access array
      const hasAllRequiredAccess = access.every((requiredAccess) =>
        permission.access.includes(requiredAccess)
      );

      if (hasAllRequiredAccess) {
        return true;
      }
    }
  }

  return false;
};
