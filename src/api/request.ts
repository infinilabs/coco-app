import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetchModule } from "@tauri-apps/plugin-http";

import { clientEnv } from "@/utils/env";

const baseURL = `${clientEnv.COCO_SERVER_URL}`

// Use a conditional fetch depending on whether it's in a Tauri environment or web
let customFetch: typeof window.fetch | typeof tauriFetchModule = window.fetch;

if (isTauri()) {
  customFetch = tauriFetchModule;
}

interface FetchRequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  parseAs?: "json" | "text" | "binary";
}

interface FetchResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

// Timeout function to reject after the specified time (in ms)
const timeoutPromise = (ms: number) => {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms} ms`)), ms)
  );
};

// The main fetch function that switches between Tauri and web fetch based on environment
export const tauriFetch = async <T = any>({
  url,
  method = "GET",
  headers = {},
  body,
  timeout = 30,
  parseAs = "json",
}: FetchRequestConfig): Promise<FetchResponse<T>> => {
  try {
    url = baseURL + url;

    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    const fetchPromise = customFetch(url, {
      method,
      headers,
      body: method !== "GET" ? JSON.stringify(body) : undefined,
    });

    const response = await Promise.race([
      fetchPromise,
      timeoutPromise(timeout * 1000),
    ]);

    const statusText = response.ok ? "OK" : "Error";

    // Handle empty or non-JSON responses gracefully
    let data: any = null;
    if (response.ok && response.headers.get("Content-Type")?.includes("application/json")) {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } else if (parseAs === "text") {
      data = await response.text();
    } else if (parseAs === "binary") {
      data = await response.arrayBuffer();
    }

    return {
      data,
      status: response.status,
      statusText,
      headers: response.headers,
    };
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
};

