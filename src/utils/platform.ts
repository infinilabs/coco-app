import { family as osFamily, platform } from "@tauri-apps/plugin-os";

export const isWeb = !("__TAURI_OS_PLUGIN_INTERNALS__" in window);
export const isMobile = isWeb
  ? navigator.userAgent.toLowerCase().includes("mobile")
  : platform() === "android";
export const isDesktop = !isMobile;
export const isMac = !isWeb && platform() === "macos";
export const isWin = !isWeb && platform() === "windows";
export const isLinux = !isWeb && platform() === "linux";
export const appScale = isMobile ? 0.5 : 1;

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
