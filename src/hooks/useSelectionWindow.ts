import { useEffect } from "react";

import platformAdapter from "@/utils/platformAdapter";
import { useSelectionStore } from "@/stores/selectionStore";
import { useSelectionPanel } from "@/hooks/useSelectionPanel";

export function useSelectionWindow() {
  const { state: panelState, close: onClose } = useSelectionPanel();

  useEffect(() => {
    const openSelectionWindow = async (payload: any) => {
      console.log("[selection] openSelectionWindow payload", payload);
      // 全局开关：关闭时不创建、不显示选择窗口
      if (!useSelectionStore.getState().selectionEnabled) {
        const existing = await platformAdapter.getWindowByLabel("selection");
        if (existing) {
          await existing.hide();
        }
        return;
      }

      const label = "selection";
      const width = 550;
      const height = 75;

      const options: any = {
        label,
        title: "Selection",
        width,
        height,
        alwaysOnTop: true,
        shadow: true,
        decorations: false,
        transparent: false,
        closable: true,
        minimizable: false,
        maximizable: false,
        dragDropEnabled: false,
        resizable: false,
        center: false,
        url: "/ui/selection",
        data: { timestamp: Date.now() },
      };

      const raw = typeof payload === "string" ? payload : String(payload?.text ?? "");
      const text = raw.trim();

      // 接收后端“全局左上角原点 + 逻辑坐标（Quartz point）”，不再进行 dpr 转换
      const xLogical = Math.round(Number(payload?.x ?? 0));
      const yLogical = Math.round(Number(payload?.y ?? 0));

      const existingWindow = await platformAdapter.getWindowByLabel(label);

      // 空内容时立即隐藏，不创建/显示窗口
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

      // 强制设置尺寸（即便窗口已存在）
      // @ts-ignore
      await win.setSize({ type: "Logical", width, height });

      await win.show();

      // 按“左上角为原点 + 逻辑坐标”直接定位；X 向右偏移 0，Y 上移 90px（不减窗口高度）
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

    // DOM 选区 + 屏幕位置计算逻辑坐标（point）
    if (panelState?.visible && panelState?.text) {
      const rect = panelState.rect || null;
      const screenX = window.screenX || 0; // CSS 像素（逻辑坐标）
      const screenY = window.screenY || 0; // CSS 像素（逻辑坐标）
      const xLogical = rect ? Math.round(screenX + rect.left) : 0;
      const yLogical = rect ? Math.round(screenY + rect.top) : 0;
      console.log("[selection] DOM fallback logical", { screenX, screenY, rect, xLogical, yLogical });

      openSelectionWindow({ text: panelState.text, x: xLogical, y: yLogical });
      onClose?.();
    }

    // 监听 selection-detected（来自后端）
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
  }, [panelState?.visible, panelState?.text, onClose]);
}