import { useEffect, useRef } from "react";

import platformAdapter from "@/utils/platformAdapter";
import { useSelectionStore } from "@/stores/selectionStore";
import { useSelectionPanel } from "@/hooks/useSelectionPanel";

export function useSelectionWindow() {
  const { state: panelState, close: onClose } = useSelectionPanel();
  const lastWidthRef = useRef<number | null>(null);

  // Subscribe to store for reactive updates
  const iconsOnly = useSelectionStore((s) => s.iconsOnly);
  const selectionEnabled = useSelectionStore((s) => s.selectionEnabled);

  const WIDTH_ICONS_ONLY = 250;
  const WIDTH_FULL = 470;
  const HEIGHT = 62;
  const getSelectionWidth = (isIconsOnly: boolean) =>
    isIconsOnly ? WIDTH_ICONS_ONLY : WIDTH_FULL;

  useEffect(() => {
    const openSelectionWindow = async (payload: any) => {
      // console.log("[selection] openSelectionWindow payload", payload);
      // when selection is disabled, hide the existing window and return
      if (!selectionEnabled) {
        const existing = await platformAdapter.getWindowByLabel("selection");
        if (existing) {
          await existing.hide();
        }
        return;
      }

      const label = "selection";
      const width = getSelectionWidth(iconsOnly);
      const height = HEIGHT;

      const options: any = {
        label,
        title: "Selection",
        width,
        height,
        alwaysOnTop: true,
        shadow: true,
        decorations: false,
        transparent: true,
        closable: true,
        minimizable: false,
        maximizable: false,
        dragDropEnabled: false,
        resizable: false,
        center: false,
        url: "/ui/selection",
        windowEffects: {
          effects: [],
          state: "active",
          radius: 7,
        },
        hiddenTitle: true,
        visible: false,
        acceptFirstMouse: true,
        data: { timestamp: Date.now() },
      };

      const raw = typeof payload === "string" ? payload : String(payload?.text ?? "");
      const text = raw.trim();

      // Receive backend "top-left origin + logical coordinates (Quartz point)" directly, no need for dpr conversion
      const xLogical = Math.round(Number(payload?.x ?? 0));
      const yLogical = Math.round(Number(payload?.y ?? 0));

      const existingWindow = await platformAdapter.getWindowByLabel(label);

      // Empty text: hide existing window and emit empty event
      if (!text) {
        if (existingWindow) {
          await existingWindow.hide();
        }
        await platformAdapter.emitEvent("selection-text", "");
        return;
      }

      if (!existingWindow) {
        await platformAdapter.createWindow(label, options);
      }
      const win = await platformAdapter.getWindowByLabel(label);
      if (!win) return;

      // Set window size to fixed width and height
      // Avoid redundant setSize calls if width is unchanged
      if (lastWidthRef.current !== width) {
        // @ts-ignore
        await win.setSize({ type: "Logical", width, height });
        lastWidthRef.current = width;
      }

      await win.show();

      // Position window based on "top-left origin + logical coordinates" directly
      // X offset 0, Y offset -90px (not subtracting window height)
      if (xLogical > 0 || yLogical > 0) {
        const offsetX = 0;
        const offsetY = 90;
        const targetX = Math.max(0, xLogical + offsetX);
        const targetY = Math.max(0, yLogical - offsetY);
        // @ts-ignore
        await win.setPosition({ type: "Logical", x: targetX, y: targetY });
      }

      await platformAdapter.emitEvent("selection-text", text);
    };

    // DOM fallback: when panel is visible and has text, use its position
    if (panelState?.visible && panelState?.text) {
      const rect = panelState.rect || null;
      const screenX = window.screenX || 0; // CSS pixel (logical coordinate)
      const screenY = window.screenY || 0; // CSS pixel (logical coordinate)
      const xLogical = rect ? Math.round(screenX + rect.left) : 0;
      const yLogical = rect ? Math.round(screenY + rect.top) : 0;
      console.log("[selection] DOM fallback logical", { screenX, screenY, rect, xLogical, yLogical });

      openSelectionWindow({ text: panelState.text, x: xLogical, y: yLogical });
      onClose?.();
    }

    // Listen to selection-detected event from backend
    const unlistenSelection = platformAdapter.listenEvent(
      "selection-detected",
      async (event: any) => {
        const payload = event?.payload;
        await openSelectionWindow(payload);
      }
    );

    return () => {
      unlistenSelection.then((fn) => fn());
    };
  }, [panelState?.visible, panelState?.text, onClose, iconsOnly, selectionEnabled]);
}