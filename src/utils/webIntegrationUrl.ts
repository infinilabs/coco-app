const APP_INTEGRATION_ID_HEADER = "app-integration-id";
const APP_INTEGRATION_ID_PARAM = "app-integration-id";

const normalizeHeaderValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return normalizeHeaderValue(value[0]);
  }

  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized || undefined;
  }

  return undefined;
};

export const getAppIntegrationIdFromHeaders = (
  headers?: Record<string, unknown>
) => {
  if (!headers) return undefined;

  const header = Object.entries(headers).find(([key]) => {
    return key.toLowerCase() === APP_INTEGRATION_ID_HEADER;
  });

  return normalizeHeaderValue(header?.[1]);
};

export const getStoredAppIntegrationId = () => {
  if (typeof localStorage === "undefined") return undefined;

  try {
    const headers = JSON.parse(localStorage.getItem("headers") || "{}");

    if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
      return undefined;
    }

    return getAppIntegrationIdFromHeaders(headers as Record<string, unknown>);
  } catch {
    return undefined;
  }
};

const hasAppIntegrationIdParam = (urlPart: string) => {
  return new RegExp(`[?&]${APP_INTEGRATION_ID_PARAM}=`).test(urlPart);
};

const appendParam = (urlPart: string, appIntegrationId: string) => {
  if (hasAppIntegrationIdParam(urlPart)) return urlPart;

  const separator = urlPart.includes("?") ? "&" : "?";
  return `${urlPart}${separator}${APP_INTEGRATION_ID_PARAM}=${encodeURIComponent(
    appIntegrationId
  )}`;
};

export const appendAppIntegrationIdToUrl = (
  url?: string,
  appIntegrationId = getStoredAppIntegrationId()
) => {
  if (!url || !appIntegrationId) return url;

  const hashRouteIndex = url.indexOf("#/");
  if (hashRouteIndex >= 0) {
    const prefix = url.slice(0, hashRouteIndex + 1);
    const hashRoute = url.slice(hashRouteIndex + 1);

    return `${prefix}${appendParam(hashRoute, appIntegrationId)}`;
  }

  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0) {
    const beforeHash = url.slice(0, hashIndex);
    const hash = url.slice(hashIndex);

    return `${appendParam(beforeHash, appIntegrationId)}${hash}`;
  }

  return appendParam(url, appIntegrationId);
};
