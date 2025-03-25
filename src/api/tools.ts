export const handleChangeRequestHeader = (config: any) => {
  config["xxxx"] = "xxx";
  return config;
};

export const handleConfigureAuth = (config: any) => {
  // config.headers["X-API-TOKEN"] = localStorage.getItem("token") || "";

  const headersStr = localStorage.getItem("headers") || "{}";
    const headers = JSON.parse(headersStr);
    console.log("headers:", headers);

  config.headers = {
    ...config.headers,
    ...headers,
  }
  console.log("config.headers", config.headers)
  return config;
};

export const handleNetworkError = (errStatus?: number): void => {
  const networkErrMap: any = {
    "400": "Bad Request", // token invalid
    "401": "Unauthorized, please login again",
    "403": "Access Denied",
    "404": "Resource Not Found",
    "405": "Method Not Allowed",
    "408": "Request Timeout",
    "500": "Internal Server Error",
    "501": "Not Implemented",
    "502": "Bad Gateway",
    "503": "Service Unavailable",
    "504": "Gateway Timeout",
    "505": "HTTP Version Not Supported",
  };
  if (errStatus) {
    console.error(networkErrMap[errStatus] ?? `Other Connection Error --${errStatus}`);
    return;
  }

  console.error("Unable to connect to server!");
};

export const handleAuthError = (errno: string): boolean => {
  const authErrMap: any = {
    "10031": "Login expired, please login again", // token invalid
    "10032": "Session timeout, please login again", // token expired
    "10033": "Account not bound to role, please contact administrator",
    "10034": "User not registered, please contact administrator",
    "10035": "Unable to get third-party platform user with code",
    "10036": "Account not linked to employee, please contact administrator",
    "10037": "Account is invalid",
    "10038": "Account not found",
  };

  if (authErrMap.hasOwnProperty(errno)) {
    console.error(authErrMap[errno]);
    // Authorization error, logout account
    // logout();
    return false;
  }

  return true;
};

export const handleGeneralError = (errno: string, errmsg: string): boolean => {
  if (errno !== "0") {
    console.error(errmsg);
    return false;
  }

  return true;
};