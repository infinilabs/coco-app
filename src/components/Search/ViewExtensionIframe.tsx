import React, { useEffect } from "react";

const HIDE_SCROLLBAR_STYLE_ID = "coco-view-extension-hide-scrollbar";

const applyHideScrollbarToIframe = (
  iframe: HTMLIFrameElement | null,
  enabled: boolean
) => {
  if (!iframe) return;

  try {
    const doc = iframe.contentDocument;
    if (!doc) return;

    const existing = doc.getElementById(HIDE_SCROLLBAR_STYLE_ID);
    if (!enabled) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const style = doc.createElement("style");
    style.id = HIDE_SCROLLBAR_STYLE_ID;
    style.textContent = `
      * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      *::-webkit-scrollbar {
        width: 0px;
        height: 0px;
      }
      `;

    const parent = doc.head ?? doc.documentElement;
    parent?.appendChild(style);
  } catch {}
};

type ViewExtensionIframeProps = {
  fileUrl: string;
  scale: number;
  iframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
  hideScrollbar: boolean;
  focusIframe: () => void;
  onLoaded?: (success: boolean) => void;
  onContentSize?: (size: { width: number; height: number }) => void;
  baseWidth?: number;
  baseHeight?: number;
};

export default function ViewExtensionIframe(props: ViewExtensionIframeProps) {
  const {
    fileUrl,
    scale,
    iframeRef,
    hideScrollbar,
    focusIframe,
    onLoaded,
    onContentSize,
    baseWidth,
    baseHeight,
  } = props;

  const isSameOrigin = () => {
    try {
      const target = new URL(fileUrl);
      const current = new URL(window.location.href);
      return (
        target.protocol === current.protocol &&
        target.hostname === current.hostname &&
        target.port === current.port
      );
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (isSameOrigin()) {
      applyHideScrollbarToIframe(iframeRef.current, hideScrollbar);
    }
  }, [hideScrollbar, iframeRef]);

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden"
      onMouseDownCapture={focusIframe}
      onPointerDown={focusIframe}
      onClickCapture={focusIframe}
    >
      <iframe
        ref={(node) => {
          iframeRef.current = node;
        }}
        src={fileUrl}
        className="border-0 w-full h-full"
        scrolling={hideScrollbar ? "no" : "auto"}
        style={{
          width: baseWidth ? `${baseWidth}px` : undefined,
          height: baseHeight ? `${baseHeight}px` : undefined,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          outline: "none",
        }}
        allow="fullscreen; pointer-lock; gamepad"
        allowFullScreen
        tabIndex={-1}
        onLoad={(event) => {
          event.currentTarget.focus();
          if (isSameOrigin()) {
            try {
              iframeRef.current?.contentWindow?.focus();
            } catch {}
            applyHideScrollbarToIframe(event.currentTarget, hideScrollbar);
            try {
              const doc = event.currentTarget.contentDocument!;
              const root = doc.documentElement;
              const body = doc.body;
              const width = Math.max(
                root?.scrollWidth ?? 0,
                body?.scrollWidth ?? 0,
                root?.clientWidth ?? 0,
                body?.clientWidth ?? 0
              );
              const height = Math.max(
                root?.scrollHeight ?? 0,
                body?.scrollHeight ?? 0,
                root?.clientHeight ?? 0,
                body?.clientHeight ?? 0
              );
              if (width > 0 && height > 0) {
                onContentSize?.({ width, height });
              }
            } catch {}
          }
          onLoaded?.(true);
        }}
        onError={() => {
          onLoaded?.(false);
        }}
      />
    </div>
  );
}
