import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

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

export const OpenURLWithBrowser = async (url: string) => {
  if (!url) return;
  if (isTauri()) {
    try {
      await open(url);
      console.log("URL opened in default browser");
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  } else {
    window.open(url);
  }
};

const unitArr = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const;

export const formatter = {
  bytes: (value: number): string => {
    if (!Number.isFinite(value) || value <= 0) {
      return "0B";
    }

    const index = Math.floor(Math.log(value) / Math.log(1024));
    const size = (value / Math.pow(1024, index)).toFixed(1);

    return size + (unitArr[index] ?? "B")
  },
};

export const formatThinkingMessage = (message: string) => {
  const segments: Array<{
    text: string;
    isThinking: boolean;
    thinkContent: string;
    isSource?: boolean;
  }> = [];

  if (!message) return segments;

  // 先处理 Source 标签
  const sourceRegex = /(<Source.*?>.*?<\/Source>)/gs;
  const parts = message.split(sourceRegex);

  parts.forEach(part => {
    if (part.startsWith('<Source')) {
      // Source 标签部分
      segments.push({
        text: part,
        isThinking: false,
        thinkContent: '',
        isSource: true
      });
    } else {
      // 处理剩余文本中的 think 标签
      const thinkParts = part.split(/(<think>.*?<\/think>)/s);
      
      thinkParts.forEach(thinkPart => {
        if (thinkPart.startsWith('<think>')) {
          // 提取 think 标签中的内容
          const content = thinkPart.replace(/<\/?think>/g, '');
          segments.push({
            text: '',
            isThinking: true,
            thinkContent: content.trim()
          });
        } else if (thinkPart.trim()) {
          // 普通文本
          segments.push({
            text: thinkPart.trim(),
            isThinking: false,
            thinkContent: ''
          });
        }
      });
    }
  });

  return segments;
};

