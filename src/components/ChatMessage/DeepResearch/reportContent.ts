import platformAdapter from "@/utils/platformAdapter";

const DEFAULT_REPORT_FETCH_TIMEOUT_MS = 45_000;
const MAX_REPORT_CACHE_SIZE = 20;

interface ReportTextCacheEntry {
  promise?: Promise<string>;
  text?: string;
}

interface ReportBlobCacheEntry {
  promise?: Promise<Blob>;
  blob?: Blob;
}

const reportTextCache = new Map<string, ReportTextCacheEntry>();
const reportBlobCache = new Map<string, ReportBlobCacheEntry>();

const buildReportCacheKey = (url: string, serverId?: string) => {
  return `${serverId || "browser"}:${url}`;
};

const rememberReportText = (key: string, entry: ReportTextCacheEntry) => {
  if (reportTextCache.has(key)) {
    reportTextCache.delete(key);
  }
  reportTextCache.set(key, entry);

  while (reportTextCache.size > MAX_REPORT_CACHE_SIZE) {
    const oldestKey = reportTextCache.keys().next().value;
    if (!oldestKey) break;
    reportTextCache.delete(oldestKey);
  }
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Request timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const readRequestHeaders = () => {
  try {
    return JSON.parse(localStorage.getItem("headers") || "{}");
  } catch (e) {
    return {};
  }
};

export const injectBaseTag = (html: string, url?: string) => {
  if (!url) return html;

  const base = `<base href="${url}">`;
  if (/<base\s/i.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
  }
  return `${base}${html}`;
};

export const toServerPath = (url: string) => {
  try {
    if (/^[a-z][a-z\d+\-.]*:/i.test(url)) {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch (e) {
    // Fall through to relative path handling.
  }

  return url.startsWith("/") ? url : `/${url}`;
};

export const getCachedReportText = (url: string, serverId?: string) => {
  const key = buildReportCacheKey(url, serverId);
  const entry = reportTextCache.get(key);
  if (!entry?.text) return undefined;

  rememberReportText(key, entry);
  return entry.text;
};

const buildReportBlobCacheKey = (url: string, serverId?: string) => {
  return buildReportCacheKey(url, serverId);
};

const rememberReportBlob = (key: string, entry: ReportBlobCacheEntry) => {
  if (reportBlobCache.has(key)) {
    reportBlobCache.delete(key);
  }
  reportBlobCache.set(key, entry);

  while (reportBlobCache.size > MAX_REPORT_CACHE_SIZE) {
    const oldestKey = reportBlobCache.keys().next().value;
    if (!oldestKey) break;
    reportBlobCache.delete(oldestKey);
  }
};

export const getCachedReportBlob = (url: string, serverId?: string) => {
  const key = buildReportBlobCacheKey(url, serverId);
  const entry = reportBlobCache.get(key);
  if (!entry?.blob) return undefined;

  rememberReportBlob(key, entry);
  return entry.blob;
};

const base64ToUint8Array = (base64: string) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const fetchReportBlobUncached = async (
  url: string,
  serverId?: string,
  timeoutMs = DEFAULT_REPORT_FETCH_TIMEOUT_MS
) => {
  const headers = readRequestHeaders();

  if (platformAdapter.isTauri() && serverId) {
    const response = await withTimeout(
      platformAdapter.commands<{ content_base64: string }>(
        "fetch_attachment_binary",
        {
          serverId,
          path: toServerPath(url),
        }
      ),
      timeoutMs
    );
    return new Blob([base64ToUint8Array(response.content_base64)], {
      type: "application/pdf",
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let buffer: ArrayBuffer;
  try {
    response = await window.fetch(url, {
      credentials: "include",
      headers,
      signal: controller.signal,
    });
    buffer = await response.arrayBuffer();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return new Blob([buffer], { type: response.headers.get("content-type") || "application/pdf" });
};

export const fetchReportBlob = async (
  url: string,
  serverId?: string,
  timeoutMs = DEFAULT_REPORT_FETCH_TIMEOUT_MS
) => {
  const key = buildReportBlobCacheKey(url, serverId);
  const cached = reportBlobCache.get(key);

  if (cached?.blob) {
    rememberReportBlob(key, cached);
    return cached.blob;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetchReportBlobUncached(url, serverId, timeoutMs)
    .then((blob) => {
      rememberReportBlob(key, { blob });
      return blob;
    })
    .catch((error) => {
      reportBlobCache.delete(key);
      throw error;
    });

  rememberReportBlob(key, { promise });
  return promise;
};

const fetchReportTextUncached = async (
  url: string,
  serverId?: string,
  timeoutMs = DEFAULT_REPORT_FETCH_TIMEOUT_MS
) => {
  const headers = readRequestHeaders();

  if (platformAdapter.isTauri() && serverId) {
    const response = await withTimeout(
      platformAdapter.commands<{ content: string }>("fetch_attachment_text", {
        serverId,
        path: toServerPath(url),
      }),
      timeoutMs
    );
    return response.content;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let text: string;
  try {
    response = await window.fetch(url, {
      credentials: "include",
      headers,
      signal: controller.signal,
    });
    text = await response.text();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(text || `Request failed (${response.status})`);
  }

  return text;
};

export const fetchReportText = async (
  url: string,
  serverId?: string,
  timeoutMs = DEFAULT_REPORT_FETCH_TIMEOUT_MS
) => {
  const key = buildReportCacheKey(url, serverId);
  const cached = reportTextCache.get(key);

  if (cached?.text) {
    rememberReportText(key, cached);
    return cached.text;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetchReportTextUncached(url, serverId, timeoutMs)
    .then((text) => {
      rememberReportText(key, { text });
      return text;
    })
    .catch((error) => {
      reportTextCache.delete(key);
      throw error;
    });

  rememberReportText(key, { promise });
  return promise;
};
