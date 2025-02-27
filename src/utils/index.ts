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

export function formatThinkingMessage(message: string) {
  const segments = [];
  let currentText = '';

  // 正则表达式匹配 Source 和 Think 标签
  const regex = /<(Source|Think)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(message)) !== null) {
    // 添加标签之前的文本
    if (match.index > lastIndex) {
      currentText = message.slice(lastIndex, match.index).trim();
      if (currentText) {
        segments.push({ text: currentText });
      }
    }

    const [fullMatch, tagName, content] = match;
    
    if (tagName === 'Source') {
      // 提取 Source 标签的类型属性
      const typeMatch = fullMatch.match(/type="([^"]+)"/);
      const sourceType = typeMatch ? typeMatch[1] : '';
      
      // 检查是否包含 Payload
      const payloadMatch = content.match(/^(.*?)\s*<Payload total=(\d+)>([\s\S]*)<\/Payload>/);
      if (payloadMatch) {
        const [_, prefix, total, payloadContent] = payloadMatch;
        try {
          const jsonData = JSON.parse(payloadContent.trim());
          segments.push({
            isSource: true,
            sourceType: sourceType,
            sourcePrefix: prefix.trim(),
            sourceData: jsonData,
            total: total,
            text: fullMatch
          });
        } catch (e) {
          console.error('Failed to parse source data:', e);
          segments.push({
            isSource: true,
            text: fullMatch
          });
        }
      }
    } else if (tagName === 'Think') {
      segments.push({
        isThinking: true,
        thinkContent: content.trim(),
        text: fullMatch  // 保留原始文本
      });
    }

    lastIndex = regex.lastIndex;
  }

  // 添加剩余的文本
  if (lastIndex < message.length) {
    currentText = message.slice(lastIndex).trim();
    if (currentText) {
      segments.push({ text: currentText });
    }
  }

  return segments;
}

