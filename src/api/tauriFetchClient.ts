import { fetch } from "@tauri-apps/plugin-http";

import { clientEnv } from "@/utils/env";
import { useLogStore } from "@/stores/logStore";

interface FetchRequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  parseAs?: "json" | "text" | "binary";
  baseURL?: string;
}

interface FetchResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

const timeoutPromise = (ms: number) => {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms} ms`)), ms)
  );
};

export const tauriFetch = async <T = any>({
  url,
  method = "GET",
  headers = {},
  body,
  timeout = 30,
  parseAs = "json",
  baseURL = clientEnv.COCO_SERVER_URL
}: FetchRequestConfig): Promise<FetchResponse<T>> => {
  const addLog = useLogStore.getState().addLog;

  try {
    const appStore = JSON.parse(localStorage.getItem("app-store") || "{}")
    const endpoint_http = appStore?.state?.endpoint_http
    baseURL = endpoint_http || clientEnv.COCO_SERVER_URL
    console.log("baseURL", baseURL)

    const authStore = JSON.parse(localStorage.getItem("auth-store") || "{}")
    const auth = authStore?.state?.auth
    console.log("auth", auth)

    if (baseURL.endsWith("/")) {
      baseURL = baseURL.slice(0, -1);
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      // If not, prepend the defaultPrefix
      url = baseURL + url;
    }

    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    headers["X-API-TOKEN"] = headers["X-API-TOKEN"] || (auth && auth[endpoint_http]?.token) || "";

    // debug API
    const requestInfo = {
      url,
      method,
      headers,
      body,
      timeout,
      parseAs,
    };

    const fetchPromise = fetch(url, {
      method,
      headers,
      body,
    });

    const response = await Promise.race([
      fetchPromise,
      timeoutPromise(timeout * 1000),
    ]);

    const statusText = response.ok ? "OK" : "Error";

    let data: any;
    if (parseAs === "json") {
      data = await response.json();
    } else if (parseAs === "text") {
      data = await response.text();
    } else {
      data = await response.arrayBuffer();
    }

    // debug API
    const log = {
      request: requestInfo,
      response: {
        data,
        status: response.status,
        statusText,
        headers: response.headers,
      },
    };
    addLog(log);

    return log.response;
  } catch (error) {
    console.error("Request failed:", error);

    // debug API
    const log = {
      request: {
        url,
        method,
        headers,
        body,
        timeout,
        parseAs,
      },
      error,
    };
    addLog(log);

    throw error;
  }
};
