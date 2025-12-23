import { useEffect, useState } from "react";
import {
  fromPairs,
  isArray,
  isNil,
  isObject,
  isString,
  sortBy,
  toPairs,
} from "lodash-es";
import { filesize as filesizeLib } from "filesize";
import i18next from "i18next";

import platformAdapter from "./platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { DEFAULT_COCO_SERVER_ID, HISTORY_PANEL_ID } from "@/constants";
import { useChatStore } from "@/stores/chatStore";
import { getCurrentWindowService } from "@/commands/windowService";
import { useSearchStore } from "@/stores/searchStore";
import { MultiSourceQueryResponse } from "@/types/search";

export async function copyToClipboard(text: string, noTip = false) {
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

  !noTip && addError(language === "zh" ? "复制成功" : "Copy Success", "info");
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
    .map(([key, value]) => `${key}=${value}`);

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

export const unrequitable = async () => {
  const { isTauri } = useAppStore.getState();
  const { id, available, enabled } = await getCurrentWindowService();

  const serviceAvailable = Boolean(id && enabled && available);

  return isTauri && !serviceAvailable;
};

export const isDefaultServer = async (checkAvailability = true) => {
  const { isTauri } = useAppStore.getState();
  const { id, available, enabled } = await getCurrentWindowService();

  const isDefault = id === DEFAULT_COCO_SERVER_ID;

  const serviceAvailable = Boolean(id && enabled && available);

  if (checkAvailability) {
    return isTauri && isDefault && serviceAvailable;
  }

  return isTauri && isDefault;
};

export const filesize = (value: number, spacer?: string) => {
  return filesizeLib(value, { standard: "jedec", spacer });
};

export const isAttachmentsUploaded = () => {
  const { uploadAttachments } = useChatStore.getState();

  return (
    uploadAttachments.length > 0 &&
    uploadAttachments.every((item) => !item.uploading)
  );
};

export const hasUploadingAttachment = () => {
  const { uploadAttachments } = useChatStore.getState();

  return uploadAttachments.some((item) => item.uploading);
};

export const getUploadedAttachmentsId = () => {
  const { uploadAttachments } = useChatStore.getState();

  return uploadAttachments
    .map((item) => item.attachmentId)
    .filter((id) => !isNil(id));
};

export const canNavigateBack = () => {
  const {
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    viewExtensionOpened,
    sourceData,
  } = useSearchStore.getState();

  return (
    goAskAi ||
    visibleExtensionStore ||
    visibleExtensionDetail ||
    viewExtensionOpened ||
    sourceData
  );
};

export const navigateBack = () => {
  const {
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    viewExtensionOpened,
    setGoAskAi,
    setVisibleExtensionDetail,
    setVisibleExtensionStore,
    setSourceData,
    setViewExtensionOpened,
  } = useSearchStore.getState();

  if (goAskAi) {
    return setGoAskAi(false);
  }

  if (visibleExtensionDetail) {
    return setVisibleExtensionDetail(false);
  }

  if (visibleExtensionStore) {
    return setVisibleExtensionStore(false);
  }

  if (viewExtensionOpened) {
    return setViewExtensionOpened(void 0);
  }

  setSourceData(void 0);
};

export const dispatchEvent = (
  key: string,
  keyCode: number,
  selector?: string
) => {
  let target: HTMLElement | Window = window;

  if (isString(selector)) {
    target = document.querySelector(selector) as HTMLElement;

    if (document.activeElement === target) return;

    target.focus();
  }

  const event = new KeyboardEvent("keydown", {
    key,
    code: key,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
  });

  target.dispatchEvent(event);
};

export const visibleSearchBar = () => {
  const { viewExtensionOpened, visibleExtensionDetail } =
    useSearchStore.getState();

  if (visibleExtensionDetail) return false;

  if (isNil(viewExtensionOpened)) return true;

  const ui = viewExtensionOpened[4];

  return ui?.search_bar ?? true;
};

export const visibleFilterBar = () => {
  const {
    viewExtensionOpened,
    visibleExtensionStore,
    visibleExtensionDetail,
    goAskAi,
  } = useSearchStore.getState();

  if (visibleExtensionStore || visibleExtensionDetail || goAskAi) return false;

  if (isNil(viewExtensionOpened)) return true;

  const ui = viewExtensionOpened[4];

  return ui?.filter_bar ?? true;
};

export const visibleFooterBar = () => {
  const { viewExtensionOpened } = useSearchStore.getState();

  if (isNil(viewExtensionOpened)) return true;

  const ui = viewExtensionOpened[4];

  return ui?.footer ?? true;
};

export const installExtensionError = (error: any) => {
  console.log(error);

  const { addError } = useAppStore.getState();

  let message = "settings.extensions.hints.importFailed";

  if (error == "AlreadyInstalled") {
    message = "settings.extensions.hints.extensionAlreadyImported";
  }

  if (isObject(error) && "IncompatiblePlatform" in error) {
    message = "settings.extensions.hints.platformIncompatibleExtension";
  }

  if (error === "IncompatibleApp") {
    message = "settings.extensions.hints.appIncompatibleExtension";
  }

  if (isObject(error) && "InvalidExtension" in error) {
    const source = (error as any).InvalidExtension.source;
    let options = {};

    if (isObject(source)) {
      if ("NoFileName" in source) {
        message = "settings.extensions.hints.noFileName";
        options = (source as any).NoFileName;
      } else if ("NonUtf8Encoding" in source) {
        message = "settings.extensions.hints.nonUtf8Encoding";
        options = (source as any).NonUtf8Encoding;
      } else if ("ReadPluginJson" in source) {
        message = "settings.extensions.hints.readPluginJson";
      } else if ("DecodePluginJson" in source) {
        message = "settings.extensions.hints.decodePluginJson";
      } else if ("ParseMinimumCocoVersion" in source) {
        message = "settings.extensions.hints.parseMinimumCocoVersion";
      } else if ("InvalidPluginJson" in source) {
        const innerSource = (source as any).InvalidPluginJson.source;
        const kind = innerSource.kind;

        if (isObject(kind)) {
          if ("DuplicateSubExtensionId" in kind) {
            message = "settings.extensions.hints.duplicateSubExtensionId";
            options = (kind as any).DuplicateSubExtensionId;
          } else if ("FieldsNotAllowed" in kind) {
            message = "settings.extensions.hints.fieldsNotAllowed";
            options = (kind as any).FieldsNotAllowed;
          } else if ("FieldsNotAllowedForSubExtension" in kind) {
            message =
              "settings.extensions.hints.fieldsNotAllowedForSubExtension";
            options = (kind as any).FieldsNotAllowedForSubExtension;
          } else if ("TypesNotAllowedForSubExtension" in kind) {
            message =
              "settings.extensions.hints.typesNotAllowedForSubExtension";
            options = (kind as any).TypesNotAllowedForSubExtension;
          } else if ("SubExtensionHasMoreSupportedPlatforms" in kind) {
            message =
              "settings.extensions.hints.subExtensionHasMoreSupportedPlatforms";
            options = (kind as any).SubExtensionHasMoreSupportedPlatforms;
          } else if ("FieldRequired" in kind) {
            message = "settings.extensions.hints.fieldRequired";
            options = (kind as any).FieldRequired;
          }
        }
      }
    } else if (source === "MissingPluginJson") {
      message = "settings.extensions.hints.missingPluginJson";
    }

    addError(i18next.t(message, options));
    return;
  }

  addError(i18next.t(message));
};

export const updateAggregations = (result?: MultiSourceQueryResponse) => {
  const { isTauri } = useAppStore.getState();

  if (!isTauri) return;

  const { setAggregations, setAggregateFilter } = useSearchStore.getState();

  if (result?.aggregations) {
    const sortedAggregations = fromPairs(
      sortBy(toPairs(result.aggregations), ([key]) => key)
    );

    for (const [key, value] of Object.entries(sortedAggregations)) {
      sortedAggregations[key].buckets = value.buckets.map((item) => ({
        ...item,
        label: item.label ?? item.key,
      }));
    }

    setAggregations(sortedAggregations);
  } else {
    setAggregations(void 0);

    setAggregateFilter(void 0);
  }
};
