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
  const { state: { endpoint_http } } = JSON.parse(localStorage.getItem("app-store") || "")
  baseURL = endpoint_http || clientEnv.COCO_SERVER_URL
  console.log("baseURL", baseURL)

  const { state: { auth } } = JSON.parse(localStorage.getItem("auth-store") || "")
  console.log("auth", auth)

  const addLog = useLogStore.getState().addLog;

  try {
    url = baseURL + url;

    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    headers["X-API-TOKEN"] = auth?.token || "";

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
      response: response,
    };
    addLog(log);

    return {
      data,
      status: response.status,
      statusText,
      headers: response.headers,
    };
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
