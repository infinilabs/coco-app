import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2, Focus } from "lucide-react";

import { useSearchStore } from "@/stores/searchStore";
import platformAdapter from "@/utils/platformAdapter";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useViewExtensionWindow } from "@/hooks/useViewExtensionWindow";
import ViewExtensionIframe from "./ViewExtensionIframe";
import { apiPermissionCheck, fsPermissionCheck } from "./viewExtensionPermissions";

const ViewExtension: React.FC = () => {
  const { viewExtensionOpened } = useSearchStore();

  // Complete list of the backend APIs, grouped by their category.
  const [apis, setApis] = useState<Map<string, string[]> | null>(null);
  const { setModifierKeyPressed } = useShortcutsStore();
  const { t } = useTranslation();

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

  const {
    resizable,
    hideScrollbar,
    scale,
    iframeRef,
    isFullscreen,
    toggleFullscreen,
    focusIframe,
  } = useViewExtensionWindow();

  return (
    <div className="relative w-full h-full">
      {resizable && (
        <button
          aria-label={
            isFullscreen
              ? t("viewExtension.fullscreen.exit")
              : t("viewExtension.fullscreen.enter")
          }
          className="absolute top-2 right-2 z-10 rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </button>
      )}
      {/* Focus helper button */}
      {resizable && (
        <button
          aria-label={t("viewExtension.focus")}
          className="absolute top-2 right-12 z-10 rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
          onClick={focusIframe}
        >
          <Focus className="size-4" />
        </button>
      )}
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

export default ViewExtension;
