import axios from "axios";

axios.defaults.withCredentials = true;

import { useAppStore } from "@/stores/appStore";

import {
  handleChangeRequestHeader,
  handleConfigureAuth,
  // handleAuthError,
  // handleGeneralError,
  handleNetworkError,
} from "./tools";

type Fn = (data: FcResponse<unknown>) => unknown;

interface IAnyObj {
  [index: string]: unknown;
}

interface FcResponse<T> {
  errno: string;
  errmsg: string;
  data: T;
}

axios.interceptors.request.use((config) => {
  config = handleChangeRequestHeader(config);
  config = handleConfigureAuth(config);
  // console.log("config", config);
  return config;
});

axios.interceptors.response.use(
  (response) => {
    if (response.status !== 200) return Promise.reject(response.data);
    // handleAuthError(response.data.errno);
    // handleGeneralError(response.data.errno, response.data.errmsg);
    return response;
  },
  (err) => {
    handleNetworkError(err?.response?.status);
    return Promise.reject(err?.response);
  }
);

export const handleApiError = (error: any) => {
  const addError = useAppStore.getState().addError;

  let message = "Request failed";

  if (error.response) {
    // Server error response
    message =
      error.response.data?.message || `Error (${error.response.status})`;
  } else if (error.request) {
    // Request failed to send
    message = "Network connection failed";
  } else {
    // Other errors
    message = error.message;
  }

  const url =
    error?.config?.url ||
    error?.response?.config?.url ||
    error?.request?.config?.url;

  const suppressProfileError =
    typeof url === "string" && url.includes("/account/profile");

  console.error(error);
  if (!suppressProfileError) {
    addError(message, "error");
  }

  return error;
};

export const Get = <T>(
  url: string,
  params: IAnyObj = {},
  clearFn?: Fn
): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");

    // In Vite dev, prefer using the proxy by keeping requests relative
    const isDev = (import.meta as any).env?.DEV === true;
    const PROXY_PREFIXES: readonly string[] = [
      "account",
      "chat",
      "query",
      "connector",
      "integration",
      "assistant",
      "datasource",
      "settings",
      "mcp_server",
    ];
    const shouldProxy =
      isDev &&
      url.startsWith("/") &&
      PROXY_PREFIXES.some((p) => url.startsWith(`/${p}`));

    let baseURL: string = appStore.state?.endpoint_http as string;
    if (!baseURL || baseURL === "undefined" || shouldProxy) {
      baseURL = "";
    }

    axios
      .get(baseURL + url, { params, withCredentials: true })
      .then((result) => {
        let res: FcResponse<T>;
        if (clearFn !== undefined) {
          res = clearFn(result?.data) as unknown as FcResponse<T>;
        } else {
          res = result?.data as FcResponse<T>;
        }

        resolve([null, res as FcResponse<T>]);
      })
      .catch((err) => {
        handleApiError(err);
        resolve([err, undefined]);
      });
  });

export const Post = <T>(
  url: string,
  data: IAnyObj | undefined,
  params: IAnyObj = {},
  headers: IAnyObj = {}
): Promise<[any, FcResponse<T> | undefined]> => {
  return new Promise((resolve) => {
    const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");

    const isDev = (import.meta as any).env?.DEV === true;
    const PROXY_PREFIXES: readonly string[] = [
      "account",
      "chat",
      "query",
      "connector",
      "integration",
      "assistant",
      "datasource",
      "settings",
      "mcp_server",
    ];
    const shouldProxy =
      isDev &&
      url.startsWith("/") &&
      PROXY_PREFIXES.some((p) => url.startsWith(`/${p}`));

    let baseURL: string = appStore.state?.endpoint_http as string;
    if (!baseURL || baseURL === "undefined" || shouldProxy) {
      baseURL = "";
    }

    axios
      .post(baseURL + url, data, {
        params,
        headers,
        withCredentials: true,
      } as any)
      .then((result) => {
        resolve([null, result.data as FcResponse<T>]);
      })
      .catch((err) => {
        handleApiError(err);
        resolve([err, undefined]);
      });
  });
};
