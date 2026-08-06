import React, { useRef, useState, RefObject, useEffect, useMemo } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";
import mermaid from "mermaid";
import { useTranslation } from "react-i18next";
import { Copy, Download, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import Tooltip from "@/components/Common/Tooltip";
import {
  copyToClipboard,
  // useWindowSize
} from "@/utils";

import "./markdown.scss";
import "./highlight.css";

let mermaidDiagramId = 0;
const MERMAID_MIN_ZOOM = 0.5;
const MERMAID_MAX_ZOOM = 10;
const MERMAID_MAX_FIT_ZOOM = 8;
const MERMAID_ZOOM_STEP = 0.2;
const MERMAID_FIT_PADDING_RATIO = 0.92;

function removeMermaidTempElements(id: string) {
  if (typeof document === "undefined") return;

  [id, `d${id}`, `i${id}`].forEach((elementId) => {
    document.getElementById(elementId)?.remove();
  });
}

function getNodeText(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      if (React.isValidElement(child)) {
        return getNodeText(
          (child.props as { children?: React.ReactNode }).children
        );
      }
      return "";
    })
    .join("");
}

function getCodeClassName(node: React.ReactNode): string {
  let className = "";

  React.Children.forEach(node, (child) => {
    if (className || !React.isValidElement(child)) return;

    const childProps = child.props as {
      className?: string;
      children?: React.ReactNode;
    };

    if (typeof childProps.className === "string") {
      className = childProps.className;
      return;
    }

    className = getCodeClassName(childProps.children);
  });

  return className;
}

function getNextMermaidZoom(current: number, delta: number) {
  const next = Math.min(
    MERMAID_MAX_ZOOM,
    Math.max(MERMAID_MIN_ZOOM, current + delta)
  );

  return Number(next.toFixed(2));
}

function getElementBackgroundColor(element?: HTMLElement | null) {
  if (!element) return "#fff";

  const color = window.getComputedStyle(element).backgroundColor;

  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return getElementBackgroundColor(element.parentElement);
  }

  return color;
}

function getMermaidContentBox(svgElement: SVGSVGElement) {
  try {
    const box = svgElement.getBBox();

    if (box.width > 0 && box.height > 0) {
      return box;
    }
  } catch (error) {
    console.error("[Mermaid] Failed to measure SVG content", error);
  }

  const viewBox = svgElement.viewBox?.baseVal;
  if (viewBox?.width && viewBox?.height) return viewBox;

  const width = Number.parseFloat(svgElement.getAttribute("width") || "");
  const height = Number.parseFloat(svgElement.getAttribute("height") || "");

  return {
    x: 0,
    y: 0,
    width: Number.isFinite(width) && width > 0 ? width : 1,
    height: Number.isFinite(height) && height > 0 ? height : 1,
  };
}

function normalizeMermaidSvgViewport(svgElement: SVGSVGElement) {
  const box = getMermaidContentBox(svgElement);
  const padding = Math.max(Math.min(box.width, box.height) * 0.04, 12);
  const width = box.width + padding * 2;
  const height = box.height + padding * 2;

  if (!width || !height) return { width: 1, height: 1 };

  svgElement.setAttribute(
    "viewBox",
    `${box.x - padding} ${box.y - padding} ${width} ${height}`
  );
  svgElement.setAttribute("width", String(width));
  svgElement.setAttribute("height", String(height));
  svgElement.style.width = `${width}px`;
  svgElement.style.height = `${height}px`;
  svgElement.style.maxWidth = "none";

  return { width, height };
}

function centerMermaidStage(stage: HTMLElement) {
  const maxLeft = stage.scrollWidth - stage.clientWidth;
  const maxTop = stage.scrollHeight - stage.clientHeight;

  if (maxLeft > 0 || maxTop > 0) {
    stage.scrollTo({
      left: Math.max(maxLeft / 2, 0),
      top: Math.max(maxTop / 2, 0),
    });
  }
}

function getSvgExportSize(svgElement: SVGSVGElement) {
  const width = Number.parseFloat(svgElement.getAttribute("width") || "");
  const height = Number.parseFloat(svgElement.getAttribute("height") || "");

  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return { width, height };
  }

  const viewBox = svgElement.viewBox?.baseVal;
  if (viewBox?.width && viewBox?.height) {
    return {
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  const box = getMermaidContentBox(svgElement);
  return {
    width: box.width,
    height: box.height,
  };
}

function replaceForeignObjectForExport(
  originalForeignObject: SVGForeignObjectElement,
  clonedForeignObject: SVGForeignObjectElement
) {
  const text = originalForeignObject.textContent?.trim() || "";

  if (!text) {
    clonedForeignObject.remove();
    return;
  }

  const labelElement =
    originalForeignObject.querySelector<HTMLElement>(
      ".nodeLabel, .edgeLabel, p, span, div"
    ) || originalForeignObject;
  const labelStyle = window.getComputedStyle(labelElement);
  const textElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  const x = Number.parseFloat(originalForeignObject.getAttribute("x") || "0");
  const y = Number.parseFloat(originalForeignObject.getAttribute("y") || "0");
  const width = Number.parseFloat(
    originalForeignObject.getAttribute("width") || "0"
  );
  const height = Number.parseFloat(
    originalForeignObject.getAttribute("height") || "0"
  );

  textElement.setAttribute("x", String(x + width / 2));
  textElement.setAttribute("y", String(y + height / 2));
  textElement.setAttribute("dominant-baseline", "middle");
  textElement.setAttribute("text-anchor", "middle");
  textElement.setAttribute("fill", labelStyle.color || "#333");
  textElement.style.fontFamily =
    labelStyle.fontFamily || "trebuchet ms, verdana, arial, sans-serif";
  textElement.style.fontSize = labelStyle.fontSize || "16px";
  textElement.style.fontWeight = labelStyle.fontWeight || "400";
  textElement.textContent = text;

  clonedForeignObject.parentNode?.replaceChild(textElement, clonedForeignObject);
}

function serializeMermaidSvg(svgElement: SVGSVGElement) {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const originalForeignObjects = Array.from(
    svgElement.querySelectorAll<SVGForeignObjectElement>("foreignObject")
  );
  const clonedForeignObjects = Array.from(
    clone.querySelectorAll<SVGForeignObjectElement>("foreignObject")
  );

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  clonedForeignObjects.forEach((clonedForeignObject, index) => {
    const originalForeignObject = originalForeignObjects[index];

    if (!originalForeignObject) {
      clonedForeignObject.remove();
      return;
    }

    replaceForeignObjectForExport(originalForeignObject, clonedForeignObject);
  });

  return new XMLSerializer().serializeToString(clone);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load Mermaid image"));
    image.src = src;
  });
}

async function svgToPngBytes(
  svgText: string,
  size: { width: number; height: number },
  backgroundColor: string
) {
  const svgBlob = new Blob([svgText], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const scale = Math.max(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    const width = Math.ceil(size.width * scale);
    const height = Math.ceil(size.height * scale);

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available");
    }

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Failed to export Mermaid PNG"));
      }, "image/png");
    });

    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function savePngBytes(
  bytes: Uint8Array,
  fileName: string,
  filterName: string
) {
  if (window.__TAURI__?.dialog?.save && window.__TAURI__?.fs?.writeBinaryFile) {
    let filePath = await window.__TAURI__.dialog.save({
      defaultPath: fileName,
      filters: [
        {
          name: filterName,
          extensions: ["png"],
        },
      ],
    });

    if (!filePath) return;

    if (!filePath.toLowerCase().endsWith(".png")) {
      filePath = `${filePath}.png`;
    }

    await window.__TAURI__.fs.writeBinaryFile(filePath, bytes);
    return;
  }

  const pngBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([pngBuffer], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getMermaidFitZoom(stage: HTMLElement, svgElement: SVGSVGElement) {
  const styles = window.getComputedStyle(stage);
  const verticalPadding =
    Number.parseFloat(styles.paddingTop || "0") +
    Number.parseFloat(styles.paddingBottom || "0");
  const availableHeight = Math.max(stage.clientHeight - verticalPadding, 1);
  const { height } = normalizeMermaidSvgViewport(svgElement);

  if (!height) return 1;

  const fitZoom = (availableHeight / height) * MERMAID_FIT_PADDING_RATIO;

  return Number(
    Math.min(
      MERMAID_MAX_FIT_ZOOM,
      Math.max(MERMAID_MIN_ZOOM, fitZoom)
    ).toFixed(2)
  );
}

// 8
function Mermaid(props: { code: string; onError?: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [svg, setSvg] = useState("");
  const [activeView, setActiveView] = useState<"image" | "code">("image");
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [diagramId] = useState(() => `mermaid-${++mermaidDiagramId}`);
  const bindFunctionsRef = useRef<((element: Element) => void) | undefined>();
  const userAdjustedZoomRef = useRef(false);

  useEffect(() => {
    if (props.code) {
      let cancelled = false;

      setActiveView("image");
      setErrorMessage("");
      setSvg("");
      setZoom(1);
      setFitZoom(1);
      userAdjustedZoomRef.current = false;
      bindFunctionsRef.current = undefined;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        suppressErrorRendering: true,
      });

      const renderDiagram = async () => {
        const canParse = await mermaid.parse(props.code, {
          suppressErrors: true,
        });

        if (!canParse) {
          throw new Error("Invalid Mermaid syntax");
        }

        return mermaid.render(diagramId, props.code, ref.current || undefined);
      };

      renderDiagram()
        .then(({ svg, bindFunctions }) => {
          if (cancelled) return;
          bindFunctionsRef.current = bindFunctions;
          setSvg(svg);
        })
        .catch((e) => {
          if (cancelled) return;
          const message = e instanceof Error ? e.message : String(e);
          removeMermaidTempElements(diagramId);
          setErrorMessage(message);
          props.onError?.();
          console.error("[Mermaid] ", message);
        });

      return () => {
        cancelled = true;
        removeMermaidTempElements(diagramId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.code]);

  useEffect(() => {
    if (svg && ref.current) {
      bindFunctionsRef.current?.(ref.current);
    }
  }, [svg]);

  useEffect(() => {
    const stage = stageRef.current;
    const svgElement = ref.current?.querySelector("svg");

    if (!svg || errorMessage || !stage || !svgElement) return;

    let frame = 0;

    const updateFitZoom = () => {
      const nextFitZoom = getMermaidFitZoom(stage, svgElement);

      setFitZoom(nextFitZoom);
      if (!userAdjustedZoomRef.current) {
        setZoom(nextFitZoom);
        window.requestAnimationFrame(() => centerMermaidStage(stage));
      }
    };

    frame = window.requestAnimationFrame(updateFitZoom);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    const resizeObserver = new ResizeObserver(updateFitZoom);
    resizeObserver.observe(stage);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [errorMessage, svg]);

  function changeZoom(delta: number) {
    userAdjustedZoomRef.current = true;
    setZoom((current) => getNextMermaidZoom(current, delta));
  }

  function resetZoom() {
    userAdjustedZoomRef.current = false;
    setZoom(fitZoom);
    window.requestAnimationFrame(() => {
      if (stageRef.current) {
        centerMermaidStage(stageRef.current);
      }
    });
  }

  async function downloadPng() {
    const svgElement = ref.current?.querySelector("svg");
    if (!svgElement) return;

    try {
      normalizeMermaidSvgViewport(svgElement);
      const svgText = serializeMermaidSvg(svgElement);
      const pngBytes = await svgToPngBytes(
        svgText,
        getSvgExportSize(svgElement),
        getElementBackgroundColor(stageRef.current)
      );

      await savePngBytes(
        pngBytes,
        `${diagramId}.png`,
        t("markdown.mermaid.pngImage")
      );
    } catch (error) {
      console.error("[Mermaid] Failed to download PNG", error);
    }
  }

  return (
    <div className="mermaid-viewer">
      <div className="mermaid-viewer-toolbar">
        <div className="mermaid-viewer-tabs">
          <Tooltip content={t("markdown.mermaid.showImage")}>
            <button
              type="button"
              className={clsx("mermaid-viewer-tab", {
                active: activeView === "image",
              })}
              aria-label={t("markdown.mermaid.showImage")}
              onClick={() => setActiveView("image")}
            >
              {t("markdown.mermaid.image")}
            </button>
          </Tooltip>
          <Tooltip content={t("markdown.mermaid.showCode")}>
            <button
              type="button"
              className={clsx("mermaid-viewer-tab", {
                active: activeView === "code",
              })}
              aria-label={t("markdown.mermaid.showCode")}
              onClick={() => setActiveView("code")}
            >
              {t("markdown.mermaid.code")}
            </button>
          </Tooltip>
        </div>

        <div className="mermaid-viewer-actions">
          {activeView === "image" ? (
            <>
              <Tooltip content={t("markdown.mermaid.zoomIn")}>
                <button
                  type="button"
                  className="mermaid-viewer-action"
                  aria-label={t("markdown.mermaid.zoomIn")}
                  onClick={() => changeZoom(MERMAID_ZOOM_STEP)}
                >
                  <ZoomIn size={18} strokeWidth={2} />
                </button>
              </Tooltip>
              <Tooltip content={t("markdown.mermaid.zoomOut")}>
                <button
                  type="button"
                  className="mermaid-viewer-action"
                  aria-label={t("markdown.mermaid.zoomOut")}
                  disabled={zoom <= MERMAID_MIN_ZOOM}
                  onClick={() => changeZoom(-MERMAID_ZOOM_STEP)}
                >
                  <ZoomOut size={18} strokeWidth={2} />
                </button>
              </Tooltip>
              <Tooltip content={t("markdown.mermaid.resetView")}>
                <button
                  type="button"
                  className="mermaid-viewer-action"
                  aria-label={t("markdown.mermaid.resetView")}
                  onClick={resetZoom}
                >
                  <RotateCcw size={18} strokeWidth={2} />
                </button>
              </Tooltip>
              <Tooltip content={t("markdown.mermaid.downloadPng")}>
                <button
                  type="button"
                  className="mermaid-viewer-action"
                  aria-label={t("markdown.mermaid.downloadPng")}
                  disabled={!svg || Boolean(errorMessage)}
                  onClick={downloadPng}
                >
                  <Download size={18} strokeWidth={2} />
                </button>
              </Tooltip>
            </>
          ) : (
            <Tooltip content={t("markdown.mermaid.copyCode")}>
              <button
                type="button"
                className="mermaid-viewer-action"
                aria-label={t("markdown.mermaid.copyCode")}
                onClick={() => copyToClipboard(props.code)}
              >
                <Copy size={18} strokeWidth={2} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="mermaid-viewer-content">
        <div
          className="mermaid-diagram-stage"
          ref={stageRef}
          hidden={activeView !== "image"}
        >
          {errorMessage ? (
            <div className="mermaid-error" title={errorMessage}>
              <div className="mermaid-error-title">
                {t("markdown.mermaid.renderFailed")}
              </div>
              <div className="mermaid-error-message">
                {t("markdown.mermaid.renderFailedDescription")}
              </div>
            </div>
          ) : (
            <div
              className="mermaid-diagram-canvas"
              style={{ zoom } as React.CSSProperties & { zoom: number }}
            >
              <div
                className="mermaid-render-target"
                ref={ref}
                dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
              />
            </div>
          )}
        </div>

        <pre className="mermaid-source-code" hidden={activeView !== "code"}>
          <code>{props.code}</code>
        </pre>
      </div>
    </div>
  );
}

// 7
function PreCode(props: {
  children?: any;
  enableMermaid?: boolean;
  hideMermaidSource?: boolean;
}) {
  const ref = useRef<HTMLPreElement>(null);
  // const previewRef = useRef<HTMLPreviewHander>(null);
  // const [htmlCode, setHtmlCode] = useState("");
  // const { height } = useWindowSize();
  // console.log(htmlCode, height);

  const mermaidCode = useMemo(() => {
    if (!props.enableMermaid) return "";

    const className = getCodeClassName(props.children);
    if (!/\blanguage-mermaid\b/.test(className)) return "";

    return getNodeText(props.children).trim();
  }, [props.children, props.enableMermaid]);

  // const enableArtifacts = true;
  // console.log(enableArtifacts);

  //Wrap the paragraph for plain-text
  useEffect(() => {
    if (ref.current) {
      const codeElements = ref.current.querySelectorAll(
        "code"
      ) as NodeListOf<HTMLElement>;
      const wrapLanguages = [
        "",
        "md",
        "markdown",
        "text",
        "txt",
        "plaintext",
        "tex",
        "latex",
      ];
      codeElements.forEach((codeElement) => {
        let languageClass = codeElement.className.match(/language-(\w+)/);
        let name = languageClass ? languageClass[1] : "";
        if (wrapLanguages.includes(name)) {
          codeElement.style.whiteSpace = "pre-wrap";
        }
      });
    }
  }, [props.children]);

  const hideSource = props.hideMermaidSource && mermaidCode.length > 0;

  return (
    <>
      {!hideSource && mermaidCode.length === 0 && (
        <pre
          ref={ref}
          className={clsx({
            "hidden-mermaid-source": hideSource,
          })}
        >
          <span
            className="copy-code-button"
            onClick={() => {
              if (ref.current) {
                copyToClipboard(
                  ref.current.querySelector("code")?.innerText ?? ""
                );
              }
            }}
          ></span>
          {props.children}
        </pre>
      )}
      {mermaidCode.length > 0 && (
        <Mermaid code={mermaidCode} key={mermaidCode} />
      )}
    </>
  );
}

// 6
function CustomCode(props: { children?: any; className?: string }) {
  const enableCodeFold = false;

  const ref = useRef<HTMLPreElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showToggle, setShowToggle] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const codeHeight = ref.current.scrollHeight;
      setShowToggle(codeHeight > 400);
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [props.children]);

  const toggleCollapsed = () => {
    setCollapsed((collapsed) => !collapsed);
  };
  const renderShowMoreButton = () => {
    if (showToggle && enableCodeFold && collapsed) {
      return (
        <div
          className={clsx("show-hide-button", {
            collapsed,
            expanded: !collapsed,
          })}
        >
          <button onClick={toggleCollapsed}>{"NewChat More"}</button>
        </div>
      );
    }
    return null;
  };
  return (
    <>
      <code
        className={clsx(props?.className)}
        ref={ref}
        style={{
          maxHeight: enableCodeFold && collapsed ? "400px" : "none",
          overflowY: "hidden",
        }}
      >
        {props.children}
      </code>

      {renderShowMoreButton()}
    </>
  );
}

// 5
function escapeBrackets(text: string) {
  const pattern =
    /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
  return text.replace(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock;
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket}$`;
      }
      return match;
    }
  );
}

// 4
function tryWrapHtmlCode(text: string) {
  // try add wrap html code (fixed: html codeblock include 2 newline)
  return text
    .replace(
      /([`]*?)(\w*?)([\n\r]*?)(<!DOCTYPE html>)/g,
      (match, quoteStart, doctype) => {
        return !quoteStart ? "\n```html\n" + doctype : match;
      }
    )
    .replace(
      /(<\/body>)([\r\n\s]*?)(<\/html>)([\n\r]*)([`]*)([\n\r]*?)/g,
      (match, bodyEnd, space, htmlEnd, quoteEnd) => {
        return !quoteEnd ? bodyEnd + space + htmlEnd + "\n```\n" : match;
      }
    );
}

// 3
function _MarkDownContent(props: {
  content: string;
  enableSyntaxHighlight?: boolean;
  enableMermaid?: boolean;
  enableMath?: boolean;
  hideMermaidSource?: boolean;
}) {
  const enableMath = props.enableMath !== false;

  const escapedContent = useMemo(() => {
    const content = enableMath ? escapeBrackets(props.content) : props.content;
    return tryWrapHtmlCode(content);
  }, [enableMath, props.content]);

  const remarkPlugins = useMemo(() => {
    return enableMath
      ? [RemarkMath, RemarkGfm, RemarkBreaks]
      : [RemarkGfm, RemarkBreaks];
  }, [enableMath]);

  const rehypePlugins = useMemo(() => {
    const plugins = [];

    if (enableMath) {
      plugins.push(RehypeKatex);
    }

    if (props.enableSyntaxHighlight !== false) {
      plugins.push([
        RehypeHighlight,
        {
          detect: false,
          ignoreMissing: true,
        },
      ]);
    }

    return plugins;
  }, [enableMath, props.enableSyntaxHighlight]);

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins as any}
      components={{
        pre: (preProps) => (
          <PreCode
            {...preProps}
            enableMermaid={props.enableMermaid !== false}
            hideMermaidSource={props.hideMermaidSource}
          />
        ),
        code: CustomCode,
        p: (pProps) => <p {...pProps} dir="auto" />,
        a: (aProps) => {
          const href = aProps.href || "";
          if (/\.(aac|mp3|opus|wav)$/.test(href)) {
            return (
              <figure>
                <audio controls src={href}></audio>
              </figure>
            );
          }
          if (/\.(3gp|3g2|webm|ogv|mpeg|mp4|avi)$/.test(href)) {
            return (
              <video controls width="99.9%">
                <source src={href} />
              </video>
            );
          }
          const isInternal = /^\/#/i.test(href);
          const target = isInternal ? "_self" : aProps.target ?? "_blank";
          return <a {...aProps} target={target} />;
        },
      }}
    >
      {escapedContent}
    </ReactMarkdown>
  );
}

// 2
const MarkdownContent = React.memo(_MarkDownContent);

// 1
export default function Markdown(
  props: {
    content: string;
    loading?: boolean;
    fontSize?: number;
    fontFamily?: string;
    parentRef?: RefObject<HTMLDivElement>;
    defaultShow?: boolean;
    enableSyntaxHighlight?: boolean;
    enableMermaid?: boolean;
    enableMath?: boolean;
    hideMermaidSource?: boolean;
  } & React.DOMAttributes<HTMLDivElement>
) {
  const mdRef = useRef<HTMLDivElement>(null);

  return (
    <div className="coco-chat">
      <div
        className="markdown-body"
        style={{
          fontSize: `${props.fontSize ?? 14}px`,
          fontFamily: props.fontFamily || "inherit",
        }}
        ref={mdRef}
        onContextMenu={props.onContextMenu}
        onDoubleClickCapture={props.onDoubleClickCapture}
        dir="auto"
      >
        <MarkdownContent
          content={props.content}
          enableSyntaxHighlight={props.enableSyntaxHighlight}
          enableMermaid={props.enableMermaid}
          enableMath={props.enableMath}
          hideMermaidSource={props.hideMermaidSource}
        />
      </div>
    </div>
  );
}
