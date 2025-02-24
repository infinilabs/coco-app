import { family as osFamily, platform } from "@tauri-apps/plugin-os";

const navigatorPlatform = navigator.platform.toLowerCase();

console.log("navigatorPlatform", navigatorPlatform);

export const isWeb = !("__TAURI_OS_PLUGIN_INTERNALS__" in window);
export const isMobile = isWeb
  ? navigator.userAgent.toLowerCase().includes("mobile")
  : platform() === "android";
export const isDesktop = !isMobile;
export const isMac = navigatorPlatform.includes("mac");
export const isWin = navigatorPlatform.includes("win");
export const isLinux = navigatorPlatform.includes("linux");
export const appScale = isMobile ? 0.5 : 1;

console.log("isMac", isMac);
console.log("isWin", isWin);
console.log("isLinux", isLinux);

export function family() {
  if (isWeb) {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("windows")) {
      return "windows";
    } else {
      return "unix";
    }
  } else {
    return osFamily();
  }
}
