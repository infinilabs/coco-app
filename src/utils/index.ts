import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

// 1
export async function copyToClipboard(text: string) {
  try {
    if (window.__TAURI__) {
      window.__TAURI__.writeText(text);
    } else {
      await navigator.clipboard.writeText(text);
    }

    console.info("Copy Success");
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      console.info("Copy Success");
    } catch (error) {
      console.info("Copy Failed");
    }
    document.body.removeChild(textArea);
  }
}

// 2
export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return size;
}

export const IsTauri = () => {
  return Boolean(
    typeof window !== 'undefined' &&
    window !== undefined &&
    (window as any).__TAURI_INTERNALS__ !== undefined
  );
};

export const OpenBrowserURL = async (url: string) => {
  if (!url) return;
  if (isTauri()) {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      console.log("URL opened in default browser");
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  } else {
    window.open(url);
  }
};

export const authWitheGithub = (uid: string) => {
  const authorizeUrl = "https://github.com/login/oauth/authorize";
  console.log("github", process.env.NODE_ENV, uid)

  location.href = `${authorizeUrl}?client_id=${"Ov23li4IcdbbWp2RgLTN"}&redirect_uri=${"http://localhost:1420/login"}`;
};
