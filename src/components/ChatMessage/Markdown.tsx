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

import {
  copyToClipboard,
  // useWindowSize
} from "@/utils";

import "./markdown.scss";
import "./highlight.css";

let mermaidDiagramId = 0;

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

// 8
function Mermaid(props: { code: string; onError?: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [svg, setSvg] = useState("");
  const [diagramId] = useState(() => `mermaid-${++mermaidDiagramId}`);
  const bindFunctionsRef = useRef<((element: Element) => void) | undefined>();

  useEffect(() => {
    if (props.code) {
      let cancelled = false;

      setErrorMessage("");
      setSvg("");
      bindFunctionsRef.current = undefined;
      mermaid.initialize({
        startOnLoad: false,
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

  function viewSvgInNewWindow() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    // const text = new XMLSerializer().serializeToString(svg);
    // const blob = new Blob([text], { type: "image/svg+xml" });
    // view img
    // URL.createObjectURL(blob);
  }

  if (errorMessage) {
    return (
      <div
        className={clsx("no-dark", "mermaid", "mermaid-error")}
        title={errorMessage}
      >
        <div className="mermaid-error-title">
          {t("markdown.mermaid.renderFailed")}
        </div>
        <div className="mermaid-error-message">
          {t("markdown.mermaid.renderFailedDescription")}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx("no-dark", "mermaid")}
      style={{
        cursor: "pointer",
        overflow: "auto",
      }}
      ref={ref}
      onClick={() => viewSvgInNewWindow()}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
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
      {!hideSource && (
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
