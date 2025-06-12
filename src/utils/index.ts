import { useEffect, useState } from "react";

import platformAdapter from "./platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { HISTORY_PANEL_ID } from "@/constants";

// 1
export async function copyToClipboard(text: string) {
  const addError = useAppStore.getState().addError;
  const language = useAppStore.getState().language;

  try {
    if (window.__TAURI__) {
      window.__TAURI__.writeText(text);
    } else {
      await navigator.clipboard.writeText(text);
    }

    console.info("Copy Success");
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      console.info("Copy Success");
    } catch (error) {
      console.error("Copy Failed");
    }
    document.body.removeChild(textArea);
  }

  addError(language === "zh" ? "复制成功" : "Copy Success", "info");
}

// 2
export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return size;
}

export const IsTauri = () => {
  return Boolean(
    typeof window !== "undefined" &&
    window !== undefined &&
    (window as any).__TAURI_INTERNALS__ !== undefined
  );
};

export const OpenURLWithBrowser = async (url?: string) => {
  if (!url) return;
  if (IsTauri()) {
    try {
      await platformAdapter.openUrl(url);
      await platformAdapter.commands("hide_coco");
      console.log("URL opened in default browser");
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  } else {
    window.open(url);
  }
};

const unitArr = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const;

export const formatter = {
  bytes: (value: number): string => {
    if (!Number.isFinite(value) || value <= 0) {
      return "0B";
    }

    const index = Math.floor(Math.log(value) / Math.log(1024));
    const size = (value / Math.pow(1024, index)).toFixed(1);

    return size + (unitArr[index] ?? "B");
  },
};

export const isImage = (value: string) => {
  const regex = /\.(jpe?g|png|webp|avif|gif|svg|bmp|ico|tiff?|heic|apng)$/i;

  return regex.test(value);
};

export const closeHistoryPanel = () => {
  const button = document.querySelector(
    `[aria-controls="${HISTORY_PANEL_ID}"]`
  );

  if (button instanceof HTMLButtonElement) {
    button.click();
  }
};

export const specialCharacterFiltering = (value?: string) => {
  if (!value) return ""
  // Filter out control characters
  return value.replace(
    /[\x00-\x1F\x7F-\x9F]/g,
    ""
  );
}
