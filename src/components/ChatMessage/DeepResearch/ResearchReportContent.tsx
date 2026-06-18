import {
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { type TFunction } from "i18next";

import Markdown from "@/components/ChatMessage/Markdown";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import { DeepResearchLoadingState } from "./DeepResearchLoadingState";
import type { DeepResearchEndChunk, ResearchReportData } from "./types";
import { PdfReportViewer } from "./PdfReportViewer";
import { resolveReportUrl } from "./resolveReportUrl";
import {
  fetchReportBlob,
  fetchReportText,
  getCachedReportBlob,
  getCachedReportText,
  injectBaseTag,
} from "./reportContent";

export interface ResearchReportContentProps {
  /** 已抓取的报告正文（markdown 或 html 文本）。优先于 data.url 渲染。 */
  content?: string;
  data?: ResearchReportData;
  endChunk?: DeepResearchEndChunk;
  serverId?: string;
  formatUrl?: (data: any) => string;
  t?: TFunction;
}

/**
 * 「报告」tab：渲染最终研究报告。
 * - html 格式 → iframe
 * - markdown 格式 → App Markdown（content 由窗口页抓取后传入）
 */
const ResearchReportContentComponent = ({
  content,
  data,
  endChunk,
  serverId: serverIdProp,
  formatUrl,
  t: tProp,
}: ResearchReportContentProps) => {
  const { t: tOriginal } = useTranslation();
  const t = tProp || tOriginal;
  const currentServiceId = useConnectStore((state) => state.currentService?.id);
  const cloudServiceId = useConnectStore((state) => state.cloudSelectService?.id);
  const serverId = serverIdProp || currentServiceId || cloudServiceId;
  const endpointHttp = useAppStore((state) => state.endpoint_http);
  const resolvedUrl = resolveReportUrl(data?.url || data?.attachment, formatUrl);
  const embeddedContent = data?.content;
  const [remoteContent, setRemoteContent] = useState<string | undefined>(() =>
    resolvedUrl ? getCachedReportText(resolvedUrl, serverId) : undefined
  );
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string>();
  const [pdfBlob, setPdfBlob] = useState<Blob>();
  const endReason = endChunk?.payload?.reason;

  useEffect(() => {
    if (content || embeddedContent) {
      setRemoteContent(undefined);
      return;
    }

    if (!resolvedUrl || data?.format === "pdf") {
      setRemoteContent(undefined);
      return;
    }

    setRemoteContent(getCachedReportText(resolvedUrl, serverId));
  }, [content, data?.format, embeddedContent, resolvedUrl, serverId]);

  useEffect(() => {
    if (data?.format === "pdf") {
      setRemoteContent(undefined);
      setFetchError(undefined);
      setIsFetching(false);
      return;
    }

    if (content || embeddedContent || !resolvedUrl) {
      setRemoteContent(undefined);
      setFetchError(undefined);
      setIsFetching(false);
      return;
    }

    const cachedContent = getCachedReportText(resolvedUrl, serverId);
    if (cachedContent) {
      setRemoteContent(cachedContent);
      setFetchError(undefined);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setFetchError(undefined);

    (async () => {
      try {
        const text = await fetchReportText(resolvedUrl, serverId);
        if (cancelled) return;

        setRemoteContent(text);
      } catch (e) {
        if (cancelled) return;
        console.error("fetch research report failed", e);
        setFetchError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [content, data?.format, embeddedContent, endpointHttp, resolvedUrl, serverId]);

  useEffect(() => {
    if (data?.format !== "pdf" || !resolvedUrl) {
      setPdfBlob(undefined);
      return;
    }

    const cachedBlob = getCachedReportBlob(resolvedUrl, serverId);
    if (cachedBlob) {
      setPdfBlob(cachedBlob);
      setFetchError(undefined);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setFetchError(undefined);

    (async () => {
      try {
        const blob = await fetchReportBlob(resolvedUrl, serverId);
        if (cancelled) return;

        setPdfBlob(blob);
      } catch (e) {
        if (cancelled) return;
        console.error("fetch research report pdf failed", e);
        setFetchError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.format, endpointHttp, resolvedUrl, serverId]);

  const reportContent = content || embeddedContent || remoteContent;
  const htmlContent = useMemo(
    () =>
      data?.format === "html" && reportContent
        ? injectBaseTag(reportContent, resolvedUrl)
        : reportContent,
    [data?.format, reportContent, resolvedUrl]
  );

  if (!content && !data && endReason === "user_cancelled") {
    return (
      <DeepResearchLoadingState
        label={t("deepResearch.report.cancelled")}
        variant="failed"
      />
    );
  }

  if (!content && !data && (endReason === "error" || endReason === "timeout")) {
    return (
      <DeepResearchLoadingState
        label={t("deepResearch.report.failed")}
        variant="failed"
      />
    );
  }

  if (!content && !data) {
    return (
      <DeepResearchLoadingState label={t("deepResearch.report.generatingTitle")} />
    );
  }

  return (
    <div className={data?.format === "pdf" ? "w-full h-full" : "w-full"}>
      {data?.format === "pdf" && pdfBlob && <PdfReportViewer blob={pdfBlob} />}

      {reportContent &&
        (data?.format === "html" ? (
          <iframe
            srcDoc={htmlContent}
            className="w-full border-0 rounded-md"
            style={{ minHeight: 520 }}
            sandbox="allow-same-origin allow-scripts"
            title="research-report"
          />
        ) : (
          <div className="text-[13px] leading-6">
            <Markdown
              content={reportContent}
              enableSyntaxHighlight={false}
              enableMermaid={false}
              enableMath={false}
            />
          </div>
        ))}

      {!reportContent && !pdfBlob && isFetching && (
        <DeepResearchLoadingState label={t("deepResearch.report.loading")} />
      )}

      {!reportContent && !pdfBlob && fetchError && (
        <DeepResearchLoadingState
          label={t("deepResearch.report.loadFailed")}
          variant="failed"
        />
      )}
    </div>
  );
};

export const ResearchReportContent = memo(ResearchReportContentComponent);
