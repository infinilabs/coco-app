import axios from "axios";

import { useAppStore } from "@/stores/appStore";

import {
  handleChangeRequestHeader,
  handleConfigureAuth,
  // handleAuthError,
  // handleGeneralError,
  handleNetworkError,
} from "./tools";

type Fn = (data: FcResponse<any>) => unknown;

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

  addError(message, "error");
  return error;
};

export const Get = <T>(
  url: string,
  params: IAnyObj = {},
  clearFn?: Fn
): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");
    // console.log("baseURL", appStore.state?.endpoint_http)

    const baseURL = appStore.state?.endpoint_https;

    axios
      .get(baseURL + url, { params })
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
  data: IAnyObj,
  params: IAnyObj = {},
  headers: IAnyObj = {}
): Promise<[any, FcResponse<T> | undefined]> => {
  return new Promise((resolve) => {
    const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");
    // console.log("baseURL", appStore.state?.endpoint_http)

    const baseURL = appStore.state?.endpoint_https;

    axios
      .post(baseURL + url, data, {
        params,
        headers,
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
