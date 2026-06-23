import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ChevronDown,
  Compass,
  FileText,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { renderAsync } from "docx-preview";
import { init as initPptxPreview } from "pptx-preview";

import loadFailedSvg from "@/components/ChatMessage/DeepResearch/load-failed.svg";
import Markdown from "@/components/ChatMessage/Markdown";
import CommonIcon from "@/components/Common/Icons/CommonIcon";
import Scrollbar from "@/components/Common/Scrollbar";
import { Button } from "@/components/ui/button";
import AIInsightIcon from "@/icons/AIInsightIcon";
import PreviewIcon from "@/icons/PreviewIcon";
import platformAdapter from "@/utils/platformAdapter";
import { formatter, OpenURLWithBrowser } from "@/utils";
import { formatDateToLocal } from "@/utils/date";

type PreviewResponse = {
  document?: {
    _id?: string;
    _source?: any;
  };
  owner?: any;
};

type PreviewResourceResponse = {
  contentType?: string;
  base64?: string;
};

type PreviewContentType =
  | "image"
  | "video"
  | "markdown"
  | "pdf"
  | "docx"
  | "pptx"
  | "html";

const previewContentTypes: PreviewContentType[] = [
  "image",
  "video",
  "markdown",
  "pdf",
  "docx",
  "pptx",
  "html",
];

const normalizePreviewContentType = (
  contentType?: string,
  mimeType?: string
): PreviewContentType | "" => {
  const value = String(contentType || mimeType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  if (!value) return "";
  if (value === "image" || value.startsWith("image/")) return "image";
  if (value === "video" || value.startsWith("video/")) return "video";
  if (["markdown", "md", "text/markdown"].includes(value)) return "markdown";
  if (["pdf", "application/pdf"].includes(value)) return "pdf";
  if (
    [
      "docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(value)
  ) {
    return "docx";
  }
  if (
    [
      "pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ].includes(value)
  ) {
    return "pptx";
  }
  if (["html", "htm", "html_doc", "text/html"].includes(value)) return "html";

  return "";
};

const getParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    serverId: params.get("serverId") || "",
    documentId: params.get("documentId") || "",
    sourceUrl: params.get("sourceUrl") || "",
  };
};

const resolveRawContentUrl = (rawContent?: string) => {
  if (!rawContent) return "";
  if (/^https?:\/\//i.test(rawContent)) return rawContent;

  const endpoint = JSON.parse(localStorage.getItem("app-store") || "{}")?.state
    ?.endpoint_http;
  if (!endpoint) return rawContent;

  return `${String(endpoint).replace(/\/$/, "")}/${rawContent.replace(/^\//, "")}`;
};

const base64ToBlob = (base64: string, contentType: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: contentType });
};

const injectHtmlPreviewStyles = (html: string, baseUrl?: string) => {
  const baseTag = baseUrl ? `<base href="${baseUrl}">` : "";
  const styles = `
    <style>
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(144, 147, 153, 0.3) transparent !important;
      }
      *::-webkit-scrollbar-thumb {
        background-color: rgba(144, 147, 153, 0.3) !important;
        border-radius: 7px !important;
      }
      *::-webkit-scrollbar {
        width: 7px !important;
        height: 7px !important;
      }
      *::-webkit-scrollbar-track-piece {
        background-color: transparent !important;
      }
      body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 24px 24px !important;
      }
    </style>
  `;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${styles}`);
  }

  return `${baseTag}${styles}${html}`;
};

const HtmlPreview = ({ html, baseUrl }: { html: string; baseUrl?: string }) => {
  return (
    <iframe
      title="HTML preview"
      srcDoc={injectHtmlPreviewStyles(html, baseUrl)}
      className="h-[68vh] w-full border-0"
      sandbox="allow-same-origin allow-scripts"
    />
  );
};

const OfficePreview = ({
  type,
  blob,
}: {
  type: "docx" | "pptx";
  blob?: Blob;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !blob) return;

    let cancelled = false;

    const renderOffice = async () => {
      container.innerHTML = "";
      const buffer = await blob.arrayBuffer();
      if (cancelled || buffer.byteLength === 0) return;

      if (type === "docx") {
        await renderAsync(buffer, container, undefined, {
          inWrapper: false,
          ignoreWidth: true,
          ignoreHeight: true,
        });
        return;
      }

      const width = container.clientWidth || 840;
      const height = Math.round(width * (9 / 16));
      const pptx = initPptxPreview(container, { width, height });
      await pptx.preview(buffer);
    };

    renderOffice().catch((error) => {
      container.innerHTML = "";
      const message = document.createElement("div");
      message.style.color = "#999";
      message.style.textAlign = "center";
      message.style.padding = "48px";
      message.textContent = String(error);
      container.appendChild(message);
    });

    return () => {
      cancelled = true;
    };
  }, [blob, type]);

  return (
    <div
      ref={containerRef}
      className="min-h-[360px] w-full overflow-hidden [&_.docx]:p-0!"
    />
  );
};

function DocumentPreviewPage() {
  const { t } = useTranslation();
  const { serverId, documentId, sourceUrl } = useMemo(getParams, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>();
  const [owner, setOwner] = useState<any>();
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceText, setResourceText] = useState("");
  const [resourceBlob, setResourceBlob] = useState<Blob>();
  const [expandedMore, setExpandedMore] = useState(false);

  const loadData = useCallback(async () => {
    if (!serverId || !documentId) {
      setError(t("documentPreview.errors.missingParams"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await platformAdapter.invokeBackend<PreviewResponse>(
        "get_document_preview",
        {
          serverId,
          documentId,
        }
      );

      setData(result?.document?._source);
      setOwner(result?.owner);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [documentId, serverId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.title = data?.title || "Document Preview";
  }, [data?.title]);

  const rawContent = data?.metadata?.raw_content || sourceUrl;
  const rawContentUrl = resolveRawContentUrl(rawContent);
  const contentType = data?.metadata?.content_type;
  const previewType = normalizePreviewContentType(
    contentType,
    data?.metadata?.mime_type
  );
  const hasPreview =
    Boolean(rawContentUrl) &&
    Boolean(previewType) &&
    previewContentTypes.includes(previewType as PreviewContentType);
  const ownerName =
    owner?.title || owner?.name || owner?.username || data?.owner?.username;
  const createdAt = data?.created ? formatDateToLocal(data.created) : "";
  const updatedAt = data?.updated ? formatDateToLocal(data.updated) : "";
  const hasInlinePreview = previewType === "image" || previewType === "video";
  const hasCollapsiblePreview =
    hasPreview && ["markdown", "pdf", "docx", "pptx", "html"].includes(previewType);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    const loadResource = async () => {
      setResourceUrl("");
      setResourceText("");
      setResourceBlob(undefined);
      setResourceError("");

      if (!hasPreview || !rawContent) return;

      setResourceLoading(true);
      try {
        const result =
          await platformAdapter.invokeBackend<PreviewResourceResponse>(
            "fetch_document_preview_resource",
            {
              serverId,
              url: rawContent,
            }
          );

        if (cancelled) return;

        const base64 = result?.base64;
        if (!base64) {
          throw new Error("Document resource is empty.");
        }

        const blob = base64ToBlob(
          base64,
          result?.contentType || "application/octet-stream"
        );

        if (previewType === "markdown" || previewType === "html") {
          setResourceText(await blob.text());
        } else if (previewType === "docx" || previewType === "pptx") {
          setResourceBlob(blob);
        } else {
          objectUrl = URL.createObjectURL(blob);
          setResourceUrl(objectUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setResourceError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setResourceLoading(false);
        }
      }
    };

    loadResource();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [hasPreview, previewType, rawContent, serverId]);

  const renderPreviewUnavailable = () => {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center">
        <img
          src={loadFailedSvg}
          alt=""
          className="h-[80px] w-[80px] select-none"
        />
        <div className="mt-3 text-sm font-medium leading-5 text-[#999] dark:text-[#A3A3A3]">
          {t("documentPreview.hints.previewUnavailableTitle")}
        </div>
        <div className="mt-1 text-sm leading-5 text-[#999] dark:text-[#A3A3A3]">
          {t("documentPreview.hints.previewUnavailableDescription")}
        </div>
        {rawContentUrl && (
          <button
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0A84FF] px-4 text-sm font-medium text-white transition hover:bg-[#0072E5]"
            onClick={() => OpenURLWithBrowser(rawContentUrl)}
          >
            <Compass className="size-4" />
            {t("documentPreview.buttons.openSource")}
          </button>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    if (!hasPreview) {
      return renderPreviewUnavailable();
    }

    if (resourceLoading) {
      return (
        <div className="flex min-h-[260px] items-center justify-center rounded-md border border-[#E6E6E6] text-sm text-[#777] dark:border-[#2A2A2A] dark:text-[#AAA]">
          <RefreshCw className="mr-2 size-4 animate-spin" />
          {t("documentPreview.loading.preview")}
        </div>
      );
    }

    if (resourceError) {
      return renderPreviewUnavailable();
    }

    const resourceReady =
      previewType === "markdown" || previewType === "html"
        ? Boolean(resourceText)
        : previewType === "docx" || previewType === "pptx"
          ? Boolean(resourceBlob)
          : Boolean(resourceUrl);

    if (!resourceReady) {
      return (
        <div className="flex min-h-[260px] items-center justify-center rounded-md border border-[#E6E6E6] text-sm text-[#777] dark:border-[#2A2A2A] dark:text-[#AAA]">
          <RefreshCw className="mr-2 size-4 animate-spin" />
          {t("documentPreview.loading.preview")}
        </div>
      );
    }

    if (previewType === "image") {
      return (
        <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg bg-black/3 p-4 dark:bg-white/5">
          <img
            src={resourceUrl}
            alt={data?.title || "Document image"}
            className="max-h-[65vh] max-w-full object-contain"
          />
        </div>
      );
    }

    if (previewType === "video") {
      return (
        <video
          controls
          src={resourceUrl}
          className="max-h-[65vh] w-full rounded-lg bg-black"
        />
      );
    }

    if (previewType === "pdf") {
      return (
        <iframe
          title={data?.title || "PDF preview"}
          src={resourceUrl}
          className="h-[68vh] w-full border-0"
        />
      );
    }

    if (previewType === "markdown") {
      return (
        <Markdown
          content={resourceText || String(data?.content || data?.summary || "")}
          enableMermaid
          hideMermaidSource
          enableMath={false}
        />
      );
    }

    if (previewType === "html") {
      return <HtmlPreview html={resourceText} baseUrl={rawContentUrl} />;
    }

    if (previewType === "docx" || previewType === "pptx") {
      return <OfficePreview type={previewType} blob={resourceBlob} />;
    }

    return null;
  };

  const renderPanel = (
    key: string,
    title: string,
    icon: React.ReactNode,
    children: React.ReactNode,
    defaultOpen = true
  ) => {
    return (
      <details
        key={key}
        open={defaultOpen}
        className="group rounded-lg border border-[#E8E8E8] bg-white dark:border-[#303030] dark:bg-[#111]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 text-[14px] leading-5 text-[#333] dark:text-[#DDD]">
            <span className="text-[#0A84FF]">{icon}</span>
            {title}
          </div>
          <ChevronDown className="size-4 text-[#999] transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#F0F0F0] px-6 py-8 dark:border-[#303030]">
          {children}
        </div>
      </details>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-[#777] dark:bg-[#111] dark:text-[#AAA]">
        <RefreshCw className="mr-2 size-4 animate-spin" />
        {t("documentPreview.loading.document")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white p-8 dark:bg-[#111]">
        <div className="flex max-w-lg flex-col items-center gap-4 text-center">
          <AlertCircle className="size-10 text-[#EF4444]" />
          <div className="text-lg font-medium text-[#222] dark:text-[#EEE]">
            {t("documentPreview.errors.loadFailed")}
          </div>
          <div className="text-sm text-[#777] dark:text-[#AAA]">{error}</div>
          <button
            className="rounded-md bg-[#0A84FF] px-4 py-2 text-sm text-white hover:bg-[#0072E5]"
            onClick={loadData}
          >
            {t("documentPreview.buttons.reload")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white text-[#222] dark:bg-[#0F0F0F] dark:text-[#EEE]">
      <Scrollbar className="h-full overflow-y-auto">
        <main className="mx-auto flex min-h-full w-full max-w-[960px] flex-col px-4 py-8">
          <section>
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-2 break-words text-[18px] leading-[26px] text-[#1A0CAB] dark:text-[#8AB4F8]">
                  <CommonIcon
                    renderOrder={["item_icon", "connector_icon", "default_icon"]}
                    item={data}
                    itemIcon={data?.icon}
                    defaultIcon={FileText}
                    className="size-5 shrink-0"
                  />
                  {data?.title || documentId}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-1 text-sm text-[#666] dark:text-[#AAA]">
                  <span>{data?.source?.name || "-"}</span>
                  {data?.category && (
                    <>
                      <span className="text-[#AAA]">›</span>
                      <span>{data.category}</span>
                    </>
                  )}
                  {ownerName && (
                    <>
                      <span className="mx-1 text-[#AAA]">|</span>
                      <span>{ownerName}</span>
                    </>
                  )}
                  {updatedAt && (
                    <>
                      <span className="mx-1 text-[#AAA]">•</span>
                      <span>{updatedAt}</span>
                    </>
                  )}
                  <button
                    className={clsx(
                      "ml-1 inline-flex size-5 items-center justify-center rounded text-[#888] transition hover:text-[#0A84FF]",
                      { "rotate-180": expandedMore }
                    )}
                    onClick={() => setExpandedMore((value) => !value)}
                    aria-label="Toggle details"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              </div>

              {rawContentUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-8 shrink-0"
                  onClick={() => OpenURLWithBrowser(rawContentUrl)}
                >
                  {t("documentPreview.buttons.openSource")}
                </Button>
              )}
            </div>

            {expandedMore && (
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg bg-black/3 p-4 text-sm dark:bg-white/5 max-sm:grid-cols-1">
                <div>
                  <span className="mr-3 text-[#999]">
                    {t("search.document.type")}
                  </span>
                  {data?.type || contentType || "-"}
                </div>
                <div>
                  <span className="mr-3 text-[#999]">
                    {t("search.document.size")}
                  </span>
                  {formatter.bytes(data?.size || 0)}
                </div>
                <div>
                  <span className="mr-3 text-[#999]">
                    {t("search.document.createdBy")}
                  </span>
                  {ownerName || "-"}
                </div>
                <div>
                  <span className="mr-3 text-[#999]">
                    {t("search.document.createdAt")}
                  </span>
                  {createdAt || "-"}
                </div>
                <div>
                  <span className="mr-3 text-[#999]">
                    {t("search.document.updatedAt")}
                  </span>
                  {updatedAt || "-"}
                </div>
              </div>
            )}
          </section>

          <section className="mt-5 flex flex-col gap-4">
            {hasInlinePreview &&
              renderPanel(
                "preview",
                t("documentPreview.labels.preview"),
                <PreviewIcon className="size-4" />,
                renderPreview()
              )}

            {hasCollapsiblePreview &&
              renderPanel(
                "preview",
                t("documentPreview.labels.preview"),
                <PreviewIcon className="size-4" />,
                renderPreview(),
                !data?.ai_insights?.text
              )}

            {data?.ai_insights?.text &&
              renderPanel(
                "ai",
                t("documentPreview.labels.aiInterpretation"),
                <AIInsightIcon className="size-4" />,
                <div className="px-2">
                  <Markdown
                    content={data.ai_insights.text}
                    enableMermaid
                    hideMermaidSource
                    enableMath={false}
                  />
                </div>
              )}

            {!hasInlinePreview &&
              !hasCollapsiblePreview &&
              !data?.ai_insights?.text &&
              renderPanel(
                "empty",
                t("documentPreview.labels.preview"),
                <PreviewIcon className="size-4" />,
                renderPreview()
              )}
          </section>
        </main>
      </Scrollbar>
    </div>
  );
}

export default DocumentPreviewPage;
