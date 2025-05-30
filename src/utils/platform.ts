const navigatorPlatform = navigator.platform.toLowerCase();

console.log("navigatorPlatform", navigatorPlatform);

export const isWeb = !("__TAURI_OS_PLUGIN_INTERNALS__" in window);
export const isDesktop = true;
export const isMac = navigatorPlatform.includes("mac");
export const isWin = navigatorPlatform.includes("win");
export const isLinux = navigatorPlatform.includes("linux");
export const appScale = 1;

console.log("isMac", isMac);
console.log("isWin", isWin);
console.log("isLinux", isLinux);

export function platform() {
  if (isWin) {
    return "windows";
  } else if (isMac) {
    return "macos";
  } else if (isLinux) {
    return "linux";
  }

  return void 0;
}

export function family() {
  if (isWeb) {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("windows")) {
      return "windows";
    } else {
      return "unix";
    }
  } else {
    return "unknown";
  }
}
