import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "lodash-es";

export interface SelectionState {
  text: string;
  rect: DOMRect | null;
  visible: boolean;
}

export function useSelectionPanel() {
  const [state, setState] = useState<SelectionState>({
    text: "",
    rect: null,
    visible: false,
  });

  const latestTextRef = useRef<string>("");

  const computeRect = useCallback((): DOMRect | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return rect;
  }, []);

  const updateSelection = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    const rect = computeRect();

    if (!text || !rect) {
      setState((prev) => ({ ...prev, visible: false }));
      latestTextRef.current = "";
      return;
    }

    // Suppress duplicates to avoid flicker and needless IPC
    if (text === latestTextRef.current && state.visible) {
      // Only reposition on scroll/resize
      setState((prev) => ({ ...prev, rect }));
      return;
    }

    latestTextRef.current = text;
    setState({ text, rect, visible: true });
  }, [computeRect, state.visible]);

  useEffect(() => {
    const onMouseUp = debounce(updateSelection, 50);
    const onSelectionChange = debounce(updateSelection, 80);

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("scroll", onSelectionChange, { passive: true });
    window.addEventListener("resize", onSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("scroll", onSelectionChange);
      window.removeEventListener("resize", onSelectionChange);
    };
  }, [updateSelection]);

  const close = useCallback(() => {
    setState({ text: "", rect: null, visible: false });
    latestTextRef.current = "";
  }, []);

  return {
    state,
    close,
  };
}