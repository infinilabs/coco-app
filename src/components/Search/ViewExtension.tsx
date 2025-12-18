import React from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2, Focus } from "lucide-react";

import { useSearchStore } from "@/stores/searchStore";
import {
  ExtensionFileSystemPermission,
  FileSystemAccess,
  ViewExtensionUISettings,
} from "../Settings/Extensions";
import platformAdapter from "@/utils/platformAdapter";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { isMac } from "@/utils/platform";
import { useAppStore } from "@/stores/appStore";

const ViewExtension: React.FC = () => {
  const { viewExtensionOpened } = useSearchStore();

  const isTauri = useAppStore((state) => state.isTauri);
  
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
  const fullscreenPrevRef = useRef<{
    width: number;
    height: number;
    resizable: boolean;
    x: number;
    y: number;
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const DEFAULT_VIEW_WIDTH = 1200;
  const DEFAULT_VIEW_HEIGHT = 900;
  const [scale, setScale] = useState(1);

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

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, [reversedApis, permission]); // Add apiPermissions as dependency

  const fileUrl = viewExtensionOpened[2];
  const ui: ViewExtensionUISettings | undefined = useMemo(() => {
    return viewExtensionOpened[4] as ViewExtensionUISettings | undefined;
  }, [viewExtensionOpened]);
  const resizable = ui?.resizable;

  const baseWidth = useMemo(() => {
    return ui && typeof ui?.width === "number" ? ui.width : DEFAULT_VIEW_WIDTH;
  }, [ui]);
  const baseHeight = useMemo(() => {
    return ui && typeof ui?.height === "number" ? ui.height : DEFAULT_VIEW_HEIGHT;
  }, [ui]);

  const recomputeScale = useCallback(async () => {
    const size = await platformAdapter.getWindowSize();
    const nextScale = Math.min(size.width / baseWidth, size.height / baseHeight);
    setScale(Math.max(nextScale, 0.1));
  }, [baseWidth, baseHeight]);

  const applyFullscreen = useCallback(
    async (next: boolean) => {
      if (next) {
        const size = await platformAdapter.getWindowSize();
        const resizable = await platformAdapter.isWindowResizable();
        const pos = await platformAdapter.getWindowPosition();
        fullscreenPrevRef.current = {
          width: size.width,
          height: size.height,
          resizable,
          x: pos.x,
          y: pos.y,
        };

        if (isMac && isTauri) {
          const monitor = await platformAdapter.getMonitorFromCursor();

          if (!monitor) return;
          const window = await platformAdapter.getCurrentWebviewWindow();
          const factor = await window.scaleFactor();

          const { size, position } = monitor;

          const { width, height } = size.toLogical(factor);
          const { x, y } = position.toLogical(factor);

          await platformAdapter.setWindowSize(width, height);
          await platformAdapter.setWindowPosition(x, y);
          await platformAdapter.setWindowResizable(true);
          await recomputeScale();
        } else {
          await platformAdapter.setWindowFullscreen(true);
          await recomputeScale();
        }
      } else {
        if (!isMac) {
          await platformAdapter.setWindowFullscreen(false);
        }
        const nextWidth =
          ui && typeof ui.width === "number" ? ui.width : DEFAULT_VIEW_WIDTH;
        const nextHeight =
          ui && typeof ui.height === "number" ? ui.height : DEFAULT_VIEW_HEIGHT;
        const nextResizable =
          ui && typeof ui.resizable === "boolean" ? ui.resizable : true;
        await platformAdapter.setWindowSize(nextWidth, nextHeight);
        await platformAdapter.setWindowResizable(nextResizable);
        await platformAdapter.centerOnCurrentMonitor();
        await recomputeScale();
        setTimeout(() => {
          iframeRef.current?.focus();
          try {
            iframeRef.current?.contentWindow?.focus();
          } catch {}
        }, 0);
      }
    },
    [ui, recomputeScale]
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
        await platformAdapter.centerOnCurrentMonitor();
        await recomputeScale();
        setTimeout(() => {
          iframeRef.current?.focus();
          try {
            iframeRef.current?.contentWindow?.focus();
          } catch {}
        }, 0);
      } else {
        if (prevWindowRef.current) {
          const prev = prevWindowRef.current;
          await platformAdapter.setWindowSize(prev.width, prev.height);
          await platformAdapter.setWindowResizable(prev.resizable);
          await platformAdapter.centerOnCurrentMonitor();
          prevWindowRef.current = null;
          await recomputeScale();
          setTimeout(() => {
            iframeRef.current?.focus();
          }, 0);
        }
      }
    };

    applyWindowSettings();
    return () => {
      if (prevWindowRef.current) {
        const prev = prevWindowRef.current;
        platformAdapter.setWindowSize(prev.width, prev.height);
        platformAdapter.setWindowResizable(prev.resizable);
        platformAdapter.centerOnCurrentMonitor();
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
      window.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      } as any);
    };
  }, [isFullscreen, applyFullscreen]);

  return (
    <div className="relative w-full h-full">
      {isFullscreen && <div className="absolute inset-0 pointer-events-none" />}
      {resizable && (
        <button
          aria-label={
            isFullscreen
              ? t("viewExtension.fullscreen.exit")
              : t("viewExtension.fullscreen.enter")
          }
          className="absolute top-2 right-2 z-10 rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
          onClick={async () => {
            const next = !isFullscreen;
            await applyFullscreen(next);
            setIsFullscreen(next);
            if (next) {
              iframeRef.current?.focus();
              try {
                iframeRef.current?.contentWindow?.focus();
              } catch {}
            }
          }}
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </button>
      )}
      {/* Focus helper button */}
      <button
        aria-label={t("viewExtension.focus")}
        className="absolute top-2 right-12 z-10 rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
        onClick={() => {
          iframeRef.current?.focus();
          try {
            iframeRef.current?.contentWindow?.focus();
          } catch {}
        }}
      >
        <Focus className="size-4"/>
      </button>
      <div
        className="w-full h-full flex items-center justify-center"
        onMouseDownCapture={() => {
          iframeRef.current?.focus();
        }}
        onPointerDown={() => {
          iframeRef.current?.focus();
        }}
        onClickCapture={() => {
          iframeRef.current?.focus();
        }}
      >
        <iframe
          ref={iframeRef}
          src={fileUrl}
          className="border-0"
          style={{
            width: `${baseWidth}px`,
            height: `${baseHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            outline: "none",
          }}
          allow="fullscreen; pointer-lock; gamepad"
          allowFullScreen
          tabIndex={-1}
          onLoad={(event) => {
            event.currentTarget.focus();
            try {
              iframeRef.current?.contentWindow?.focus();
            } catch {}
          }}
        />
      </div>
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
