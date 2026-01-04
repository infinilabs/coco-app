import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import platformAdapter from "@/utils/platformAdapter";
import type { ViewExtensionUISettingsOrNull } from "@/components/Settings/Extensions";
import { useAppStore } from "@/stores/appStore";
import { useExtensionStore, type ViewExtensionOpened } from "@/stores/extensionStore";

type WindowSnapshot = {
  width: number;
  height: number;
  resizable: boolean;
  x: number;
  y: number;
};

export function useViewExtensionWindow(opts?: {
  forceResizable?: boolean;
  ignoreExplicitSize?: boolean;
  viewExtension?: ViewExtensionOpened | null;
  isStandalone?: boolean;
  padding?: number;
  containerRef?: React.RefObject<HTMLElement>;
}) {
  const {
    forceResizable = false,
    ignoreExplicitSize = false,
    viewExtension = null,
    isStandalone = false,
    padding = 0,
    containerRef,
  } = opts || {};

  const isTauri = useAppStore((state) => state.isTauri);
  const storeViewExtension = useExtensionStore((state) => 
    viewExtension ? undefined : (state.viewExtensions.length > 0 ? state.viewExtensions[state.viewExtensions.length - 1] : undefined)
  );
  const viewExtensionOpened = viewExtension ?? storeViewExtension;

  if (viewExtensionOpened == null) {
    throw new Error(
      "ViewExtension Error: viewExtensionOpened is null. This should not happen."
    );
  }

  const ui: ViewExtensionUISettingsOrNull = useMemo(() => {
    return viewExtensionOpened[4] as ViewExtensionUISettingsOrNull;
  }, [viewExtensionOpened]);
  const resizable = forceResizable ? true : ui?.resizable;
  const hideScrollbar = ui?.hide_scrollbar ?? true;
  const detachable = ui?.detachable ?? false;

  const uiWidth = ui && typeof ui.width === "number" ? ui.width : null;
  const uiHeight = ui && typeof ui.height === "number" ? ui.height : null;
  const hasExplicitWindowSize =
    uiWidth != null && uiHeight != null && !ignoreExplicitSize;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const prevWindowRef = useRef<WindowSnapshot | null>(null);
  const [scale, setScale] = useState(1);
  const [fallbackViewSize, setFallbackViewSize] = useState<{
    width: number;
    height: number;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    return { width: window.innerWidth, height: window.innerHeight };
  });

  const baseWidth = useMemo(() => {
    if (uiWidth != null) return uiWidth;
    if (fallbackViewSize != null) return fallbackViewSize.width;
    return 0;
  }, [uiWidth, fallbackViewSize]);
  const baseHeight = useMemo(() => {
    if (uiHeight != null) return uiHeight;
    if (fallbackViewSize != null) return fallbackViewSize.height;
    return 0;
  }, [uiHeight, fallbackViewSize]);

  const focusIframe = useCallback(() => {
    iframeRef.current?.focus();
    try {
      iframeRef.current?.contentWindow?.focus();
    } catch {}
  }, []);

  const focusIframeSoon = useCallback(() => {
    setTimeout(() => {
      focusIframe();
    }, 0);
  }, [focusIframe]);

  const recomputeScale = useCallback(async () => {
    if (!hasExplicitWindowSize) {
      setScale(1);
      return;
    }
    
    let availableWidth: number;
    let availableHeight: number;

    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      availableWidth = Math.max(0, rect.width - padding);
      availableHeight = Math.max(0, rect.height - padding);
    } else {
      const size = await platformAdapter.getWindowSize();
      availableWidth = Math.max(0, size.width - padding);
      availableHeight = Math.max(0, size.height - padding);
    }

    const ratioW = availableWidth / baseWidth;
    const ratioH = availableHeight / baseHeight;
    const nextScale = Math.min(ratioW, ratioH);
    setScale(Math.max(nextScale, 0.1));
  }, [baseHeight, baseWidth, hasExplicitWindowSize, padding, containerRef]);

  useEffect(() => {
    const applyWindowSettings = async () => {
      const size = await platformAdapter.getWindowSize();
      const windowResizable = await platformAdapter.isWindowResizable();
      const pos = await platformAdapter.getWindowPosition();
      setFallbackViewSize({ width: size.width, height: size.height });
      prevWindowRef.current = {
        width: size.width,
        height: size.height,
        resizable: windowResizable,
        x: pos.x,
        y: pos.y,
      };

      if (isTauri && (await platformAdapter.isWindowFullscreen())) {
        return;
      }

      if (hasExplicitWindowSize) {
        const nextResizable =
          forceResizable
            ? true
            : ui && typeof ui.resizable === "boolean"
            ? ui.resizable
            : true;
        
        const targetWidth = uiWidth! + (isStandalone ? padding : 0);
        const targetHeight = uiHeight! + (isStandalone ? padding : 0);
        await platformAdapter.setWindowSize(targetWidth, targetHeight);
        await platformAdapter.setWindowResizable(nextResizable);
        await platformAdapter.centerOnCurrentMonitor();
        await recomputeScale();
      } else {
        await recomputeScale();
      }
      
      if (isStandalone) {
        await platformAdapter.showWindow();
        // Force window to top
        await platformAdapter.setAlwaysOnTop(true);
        await platformAdapter.setAlwaysOnTop(false);
      }
      
      focusIframeSoon();
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
  }, [
    focusIframeSoon,
    hasExplicitWindowSize,
    recomputeScale,
    ui,
    uiHeight,
    uiWidth,
    isStandalone,
    padding,
    forceResizable,
    isTauri
  ]);

  useEffect(() => {
    const handleResize = async () => {
      if (hasExplicitWindowSize) {
        recomputeScale();
      }
    };
    
    window.addEventListener("resize", handleResize);
    
    let observer: ResizeObserver | null = null;
    if (containerRef?.current) {
        observer = new ResizeObserver(() => {
            handleResize();
        });
        observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [hasExplicitWindowSize, recomputeScale, containerRef]);

  return {
    ui,
    resizable,
    detachable,
    hideScrollbar,
    scale,
    baseWidth,
    baseHeight,
    iframeRef,
    focusIframe,
    setBaseSize: (width: number, height: number) => {
      if (!hasExplicitWindowSize) {
        setFallbackViewSize({ width, height });
        recomputeScale();
      }
    },
  };
}
