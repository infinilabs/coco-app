import { useEffect, useState } from "react";
import { isArray, isNil, isObject, isString } from "lodash-es";
import { filesize as filesizeLib } from "filesize";

import platformAdapter from "./platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { DEFAULT_COCO_SERVER_ID, HISTORY_PANEL_ID } from "@/constants";
import { useConnectStore } from "@/stores/connectStore";
import { useAuthStore } from "@/stores/authStore";

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

export interface SearchQuery {
  query?: string;
  from?: number;
  size?: number;
  fuzziness?: 1 | 2 | 3 | 4 | 5;
  filters?: Record<string, any>;
}

const isTrulyEmpty = (value: unknown) => {
  const isNilValue = isNil(value);

  const isEmptyString = isString(value) && value.trim() === "";

  const isEmptyArray = isArray(value) && value.length === 0;

  const isEmptyObject = isObject(value) && Object.keys(value).length === 0;

  return isNilValue || isEmptyString || isEmptyArray || isEmptyObject;
};

export const parseSearchQuery = (searchQuery: SearchQuery) => {
  const { filters, ...rest } = searchQuery;

  const result = Object.entries(rest)
    .filter(([_, value]) => !isTrulyEmpty(value))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);

  if (isObject(filters)) {
    for (const [key, value] of Object.entries(filters)) {
      if (isTrulyEmpty(value)) continue;

      if (isArray(value)) {
        for (const item of value) {
          result.push(`filter=${key}:${encodeURIComponent(item)}`);
        }
      } else {
        result.push(`filter=${key}:${value}`);
      }
    }
  }

  return result;
};

export const unrequitable = () => {
  const { isTauri } = useAppStore.getState();
  const { currentService } = useConnectStore.getState();
  const { isCurrentLogin } = useAuthStore.getState();
  const { id, available, enabled } = currentService ?? {};

  const serviceAvailable = Boolean(
    id && enabled && available && isCurrentLogin
  );

  return isTauri && !serviceAvailable;
};

export const isDefaultServer = (checkAvailability = true) => {
  const { isTauri } = useAppStore.getState();
  const { currentService } = useConnectStore.getState();
  const { isCurrentLogin } = useAuthStore.getState();
  const { id, available, enabled } = currentService ?? {};

  const isDefaultServer = currentService.id === DEFAULT_COCO_SERVER_ID;

  const serviceAvailable = Boolean(
    id && enabled && available && isCurrentLogin
  );

  if (checkAvailability) {
    return isTauri && isDefaultServer && serviceAvailable;
  }

  return isTauri && isDefaultServer;
};

export const filesize = (value: number, spacer?: string) => {
  return filesizeLib(value, { standard: "jedec", spacer });
};
