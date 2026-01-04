import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Focus, ExternalLink } from "lucide-react";

import { useExtensionStore, type ViewExtensionOpened } from "@/stores/extensionStore";
import platformAdapter from "@/utils/platformAdapter";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useViewExtensionWindow } from "@/hooks/useViewExtensionWindow";
import ViewExtensionIframe from "./ViewExtensionIframe";
import {
  apiPermissionCheck,
  fsPermissionCheck,
} from "./viewExtensionPermissions";

type ControlsProps = {
  showFullscreen?: boolean;
  showDetach?: boolean;
  showFocus?: boolean;
  forceResizable?: boolean;
  initialViewExtensionOpened?: ViewExtensionOpened | null;
  isStandalone?: boolean;
};

const ViewExtensionContent: React.FC<ControlsProps> = ({
  showDetach = true,
  showFocus = true,
  forceResizable = false,
  initialViewExtensionOpened = null,
  isStandalone = false,
}) => {
  const storeView = useExtensionStore((state) => 
    initialViewExtensionOpened ? undefined : (state.viewExtensions.length > 0 ? state.viewExtensions[state.viewExtensions.length - 1] : undefined)
  );
  const viewExtensionOpened = initialViewExtensionOpened ?? storeView;

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
    baseWidth,
    baseHeight,
    iframeRef,
    focusIframe,
    setBaseSize,
  } = useViewExtensionWindow({ forceResizable, viewExtension: viewExtensionOpened, isStandalone });

  const [iframeReady, setIframeReady] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {iframeReady && (
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
          {detachable && showDetach && (
            <button
              aria-label={t("viewExtension.detach")}
              className="rounded-md bg-black/40 text-white p-2 hover:bg-black/60 focus:outline-none"
              onClick={() => {
                const ext = viewExtensionOpened!;
                const name = ext[0] || "extension";
                const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const label = `view_extension_${safe}`;
                const payload = btoa(encodeURIComponent(JSON.stringify(ext)));
                platformAdapter.invokeBackend("show_view_extension", {
                  label,
                  query: `?manual=1&ext=${payload}`,
                  width: baseWidth,
                  height: baseHeight,
                });
              }}
            >
              <ExternalLink className="size-4" />
            </button>
          )}
        </div>
      )}
      <ViewExtensionIframe
        fileUrl={fileUrl}
        scale={scale}
        baseWidth={baseWidth}
        baseHeight={baseHeight}
        iframeRef={iframeRef}
        hideScrollbar={hideScrollbar}
        focusIframe={focusIframe}
        onLoaded={(ok) => setIframeReady(ok)}
        onContentSize={(size) => setBaseSize(size.width, size.height)}
      />
    </div>
  );
};

const ViewExtension: React.FC<ControlsProps> = (props) => {
  const storeView = useExtensionStore(
    (state) => props.initialViewExtensionOpened ? undefined : (state.viewExtensions.length > 0 ? state.viewExtensions[state.viewExtensions.length - 1] : undefined)
  );

  const viewExtensionOpened = props.initialViewExtensionOpened ?? storeView;

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
