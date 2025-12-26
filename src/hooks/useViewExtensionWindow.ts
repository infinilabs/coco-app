import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import platformAdapter from "@/utils/platformAdapter";
import { isMac } from "@/utils/platform";
import type { ViewExtensionUISettingsOrNull } from "@/components/Settings/Extensions";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";

type WindowSnapshot = {
  width: number;
  height: number;
  resizable: boolean;
  x: number;
  y: number;
};

export function useViewExtensionWindow() {
  const isTauri = useAppStore((state) => state.isTauri);
  const viewExtensionOpened = useSearchStore((state) => state.viewExtensionOpened);

  if (viewExtensionOpened == null) {
    throw new Error(
      "ViewExtension Error: viewExtensionOpened is null. This should not happen."
    );
  }

  const ui: ViewExtensionUISettingsOrNull = useMemo(() => {
    return viewExtensionOpened[4] as ViewExtensionUISettingsOrNull;
  }, [viewExtensionOpened]);
  const resizable = ui?.resizable;
  const hideScrollbar = ui?.hide_scrollbar ?? true;

  const uiWidth = ui && typeof ui.width === "number" ? ui.width : null;
  const uiHeight = ui && typeof ui.height === "number" ? ui.height : null;
  const hasExplicitWindowSize = uiWidth != null && uiHeight != null;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevWindowRef = useRef<WindowSnapshot | null>(null);
  const fullscreenPrevRef = useRef<WindowSnapshot | null>(null);
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
    const size = await platformAdapter.getWindowSize();
    const nextScale = Math.min(size.width / baseWidth, size.height / baseHeight);
    setScale(Math.max(nextScale, 0.1));
  }, [baseHeight, baseWidth, hasExplicitWindowSize]);

  const applyFullscreen = useCallback(
    async (next: boolean, options?: { centerOnExit?: boolean }) => {
      const centerOnExit = options?.centerOnExit ?? true;
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
        const prevPos =
          fullscreenPrevRef.current != null
            ? { x: fullscreenPrevRef.current.x, y: fullscreenPrevRef.current.y }
            : null;

        if (!isMac) {
          await platformAdapter.setWindowFullscreen(false);
        }

        if (fullscreenPrevRef.current) {
          const prev = fullscreenPrevRef.current;
          await platformAdapter.setWindowSize(prev.width, prev.height);
          await platformAdapter.setWindowResizable(prev.resizable);
          fullscreenPrevRef.current = null;
        } else if (hasExplicitWindowSize) {
          const nextResizable =
            ui && typeof ui.resizable === "boolean" ? ui.resizable : true;
          await platformAdapter.setWindowSize(uiWidth, uiHeight);
          await platformAdapter.setWindowResizable(nextResizable);
        }

        if (centerOnExit) {
          await platformAdapter.centerOnCurrentMonitor();
        } else if (prevPos != null) {
          await platformAdapter.setWindowPosition(prevPos.x, prevPos.y);
        }

        await recomputeScale();
        focusIframeSoon();
      }
    },
    [
      focusIframeSoon,
      hasExplicitWindowSize,
      isTauri,
      recomputeScale,
      ui,
      uiHeight,
      uiWidth,
    ]
  );

  const toggleFullscreen = useCallback(async () => {
    const next = !isFullscreen;
    await applyFullscreen(next);
    setIsFullscreen(next);
    if (next) focusIframe();
  }, [applyFullscreen, focusIframe, isFullscreen]);

  useEffect(() => {
    const applyWindowSettings = async () => {
      const size = await platformAdapter.getWindowSize();
      const resizable = await platformAdapter.isWindowResizable();
      const pos = await platformAdapter.getWindowPosition();
      setFallbackViewSize({ width: size.width, height: size.height });
      prevWindowRef.current = {
        width: size.width,
        height: size.height,
        resizable,
        x: pos.x,
        y: pos.y,
      };

      if (hasExplicitWindowSize) {
        const nextResizable =
          ui && typeof ui.resizable === "boolean" ? ui.resizable : true;
        await platformAdapter.setWindowSize(uiWidth, uiHeight);
        await platformAdapter.setWindowResizable(nextResizable);
        await platformAdapter.centerOnCurrentMonitor();
        await recomputeScale();
      } else {
        await recomputeScale();
      }
      focusIframeSoon();
    };

    applyWindowSettings();
    return () => {
      if (prevWindowRef.current) {
        const prev = prevWindowRef.current;
        if (!isMac && fullscreenPrevRef.current != null) {
          platformAdapter.setWindowFullscreen(false);
        }
        platformAdapter.setWindowSize(prev.width, prev.height);
        platformAdapter.setWindowResizable(prev.resizable);
        platformAdapter.setWindowPosition(prev.x, prev.y);

        prevWindowRef.current = null;
        fullscreenPrevRef.current = null;
      }
    };
  }, [
    focusIframeSoon,
    hasExplicitWindowSize,
    recomputeScale,
    ui,
    uiHeight,
    uiWidth,
  ]);

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
  }, [applyFullscreen, isFullscreen]);

  return {
    ui,
    resizable,
    hideScrollbar,
    scale,
    iframeRef,
    isFullscreen,
    toggleFullscreen,
    focusIframe,
  };
}
