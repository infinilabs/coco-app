import { useAppStore } from "@/stores/appStore";

const ABSOLUTE_URL_RE = /^[a-z][a-z\d+\-.]*:/i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getEndpointHttp = () => {
  const endpointFromStore = useAppStore.getState().endpoint_http;
  if (endpointFromStore && endpointFromStore !== "undefined") {
    return endpointFromStore;
  }

  try {
    const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");
    const endpointFromStorage = appStore?.state?.endpoint_http;
    if (endpointFromStorage && endpointFromStorage !== "undefined") {
      return endpointFromStorage;
    }
  } catch (e) {
    // Ignore malformed persisted state and fall back to the original URL.
  }

  return "";
};

export const resolveReportUrl = (
  url?: string,
  formatUrl?: (data: any) => string
) => {
  if (!url) return undefined;

  const formattedUrl = (formatUrl && formatUrl({ url })) || url;
  if (
    !formattedUrl ||
    ABSOLUTE_URL_RE.test(formattedUrl) ||
    formattedUrl.startsWith("//")
  ) {
    return formattedUrl;
  }

  const endpointHttp = getEndpointHttp();
  if (!endpointHttp) return formattedUrl;

  const path = formattedUrl.startsWith("/")
    ? formattedUrl
    : `/${formattedUrl}`;
  return `${trimTrailingSlash(endpointHttp)}${path}`;
};
