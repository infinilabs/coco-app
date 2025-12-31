import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Focus, ExternalLink } from "lucide-react";

import { useExtensionStore } from "@/stores/extensionStore";
import platformAdapter from "@/utils/platformAdapter";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useViewExtensionWindow } from "@/hooks/useViewExtensionWindow";
import ViewExtensionIframe from "./ViewExtensionIframe";
import { apiPermissionCheck, fsPermissionCheck } from "./viewExtensionPermissions";

type ControlsProps = {
  showFullscreen?: boolean;
  showDetach?: boolean;
  showFocus?: boolean;
  forceResizable?: boolean;
};

const ViewExtensionContent: React.FC<ControlsProps> = ({
  showFullscreen = true,
  showDetach = true,
  showFocus = true,
  forceResizable = false,
}) => {
  const viewExtensionOpened = useExtensionStore((state) => state.viewExtensionOpened);

  // Complete list of the backend APIs, grouped by their category.
  const [apis, setApis] = useState<Map<string, string[]> | null>(null);
  const { setModifierKeyPressed } = useShortcutsStore();
  const { t } = useTranslation();

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
  const permission = viewExtensionOpened![3];

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

  const fileUrl = viewExtensionOpened![2];

  const {
    resizable,
    detachable,
    hideScrollbar,
    scale,
    iframeRef,
    focusIframe,
  } = useViewExtensionWindow({ forceResizable });

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {resizable && showFocus && (
          <button
            aria-label={t("viewExtension.focus")}
            className="rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
            onClick={focusIframe}
          >
            <Focus className="size-4" />
          </button>
        )}
        {((detachable && showDetach) || (resizable && showFullscreen)) && (
          <button
            aria-label={t("viewExtension.detach")}
            className="rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
            onClick={() => platformAdapter.invokeBackend("show_view_extension")}
          >
            <ExternalLink className="size-4" />
          </button>
        )}
      </div>
      <ViewExtensionIframe
        fileUrl={fileUrl}
        scale={scale}
        iframeRef={iframeRef}
        hideScrollbar={hideScrollbar}
        focusIframe={focusIframe}
      />
    </div>
  );
};

const ViewExtension: React.FC<ControlsProps> = (props) => {
  const viewExtensionOpened = useExtensionStore((state) => state.viewExtensionOpened);

  if (viewExtensionOpened == null) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return <ViewExtensionContent {...props} />;
};

export default ViewExtension;
