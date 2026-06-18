import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import clsx from "clsx";

import { Post } from "@/api/axiosRequest";
import type { IChunkData } from "@/types/chat";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { ResearchReportContent } from "./ResearchReportContent";
import { ResearchSearchResultsContent } from "./ResearchSearchResultsContent";
import { ResearchStepsContent } from "./ResearchStepsContent";
import { fetchReportBlob, fetchReportText, toServerPath } from "./reportContent";
import {
  buildSearchHits,
  buildStatuses,
  buildSteps,
  deriveDeepResearchState,
} from "./deriveState";
import { normalizeResearchReportData } from "./payload";
import { resolveReportUrl } from "./resolveReportUrl";
import type {
  DeepResearchEndChunk,
  ResearchReportData,
  StepItem,
  StepSearchHit,
} from "./types";

export type DeepResearchTabKey = "report" | "steps" | "searchResults";

export interface DeepResearchPanelPayload {
  viewKey: string;
  chunks: IChunkData[];
  defaultTab: DeepResearchTabKey;
  reportData?: ResearchReportData;
  serverId?: string;
  endChunk?: DeepResearchEndChunk;
  question?: string;
  theme?: "light" | "dark";
  language?: string;
}

export interface DeepResearchViewData {
  steps: StepItem[];
  searchHits: StepSearchHit[];
  reportData?: ResearchReportData;
  serverId?: string;
  endChunk?: DeepResearchEndChunk;
  question?: string;
  isEnd: boolean;
  plannerStatus: ReturnType<typeof buildStatuses>["plannerStatus"];
  executionStatus: ReturnType<typeof buildStatuses>["executionStatus"];
  reportStatus: ReturnType<typeof buildStatuses>["reportStatus"];
}

const sanitizeFilename = (value: string) => {
  return value.replace(/[\\/:*?"<>|]+/g, "_").trim();
};

const ensureExtension = (filename: string, extension: string) => {
  return filename.toLowerCase().endsWith(extension)
    ? filename
    : `${filename}${extension}`;
};

const getReportExtension = (format?: string) => {
  if (format === "html") return ".html";
  if (format === "pdf") return ".pdf";
  return ".md";
};

const getReportMimeType = (format?: string) => {
  if (format === "html") return "text/html;charset=utf-8";
  if (format === "pdf") return "application/pdf";
  return "text/markdown;charset=utf-8";
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
};

export const buildDeepResearchViewFromChunks = (
  chunks: IChunkData[],
  reportDataOverride?: ResearchReportData,
  endChunk?: DeepResearchEndChunk,
  question?: string,
  serverId?: string
): DeepResearchViewData => {
  const state = deriveDeepResearchState(chunks);
  const steps = buildSteps(state);
  const searchHits = buildSearchHits(state);
  const statuses = buildStatuses(state, steps);
  const reportData =
    normalizeResearchReportData(reportDataOverride) ||
    state.deepResearchReportData;
  const isEnd =
    !!endChunk?.payload?.reason ||
    state.deepResearchReporterFinished ||
    !!reportData?.url ||
    !!reportData?.attachment ||
    !!reportData?.content;

  return {
    steps,
    searchHits,
    reportData,
    serverId,
    endChunk,
    question,
    isEnd,
    ...statuses,
  };
};

export interface DeepResearchPanelHistoryPayload
  extends DeepResearchPanelPayload {}

export const buildDeepResearchPanelFromHistory = async (
  sessionId: string,
  messageId: string,
  defaultTab: DeepResearchTabKey,
  language?: string
): Promise<DeepResearchPanelHistoryPayload | null> => {
  const result = await Post<any>(`/chat/${sessionId}/_open`, {});
  const res: any = result?.[1];
  const messages: any[] = res?.messages || res?.hits?.hits || [];
  const msg = messages.find((m) => m?._id === messageId);
  const details: any[] = msg?._source?.details || [];
  const detail = details.find((d) => d?.type === "deep_research");
  const chunks: IChunkData[] = Array.isArray(detail?.payload)
    ? detail.payload
    : [];
  const endDetail = details.find((d) => d?.type === "reply_end");

  return {
    viewKey: `${sessionId}:${messageId}`,
    chunks,
    defaultTab,
    reportData: normalizeResearchReportData(msg?._source?.payload),
    serverId: msg?._source?.server_id,
    endChunk: endDetail,
    question: msg?._source?.question,
    language,
  };
};

interface DeepResearchPanelProps {
  payload: DeepResearchPanelPayload;
  onClose?: () => void;
  className?: string;
}

export function DeepResearchPanel({
  payload,
  onClose,
  className,
}: DeepResearchPanelProps) {
  const { t, i18n } = useTranslation();
  const addError = useAppStore((state) => state.addError);
  const withVisibility = useAppStore((state) => state.withVisibility);
  const [activeTab, setActiveTab] = useState<DeepResearchTabKey>(
    payload.defaultTab
  );
  const [mountedTabs, setMountedTabs] = useState<
    Record<DeepResearchTabKey, boolean>
  >({
    report: payload.defaultTab === "report",
    steps: payload.defaultTab === "steps",
    searchResults: payload.defaultTab === "searchResults",
  });

  useEffect(() => {
    setActiveTab(payload.defaultTab);
    setMountedTabs({
      report: payload.defaultTab === "report",
      steps: payload.defaultTab === "steps",
      searchResults: payload.defaultTab === "searchResults",
    });
  }, [payload.viewKey, payload.defaultTab]);

  useEffect(() => {
    setMountedTabs((current) =>
      current[activeTab] ? current : { ...current, [activeTab]: true }
    );
  }, [activeTab]);

  useEffect(() => {
    if (payload.language) {
      i18n.changeLanguage(payload.language);
    }
  }, [i18n, payload.language]);

  const view = useMemo(
    () =>
      buildDeepResearchViewFromChunks(
        payload.chunks,
        payload.reportData,
        payload.endChunk,
        payload.question,
        payload.serverId
      ),
    [
      payload.chunks,
      payload.endChunk,
      payload.question,
      payload.reportData,
      payload.serverId,
    ]
  );

  const reportUrl = resolveReportUrl(
    view.reportData?.url || view.reportData?.attachment
  );

  const handleDownloadReport = useCallback(async () => {
    if (!reportUrl || !view.reportData) return;

    try {
      const reportData = view.reportData;
      const extension = getReportExtension(reportData.format);
      const rawTitle = reportData.title || t("deepResearch.report.defaultTitle");
      const filename = ensureExtension(
        sanitizeFilename(rawTitle) || t("deepResearch.report.defaultTitle"),
        extension
      );
      const isPdf = reportData.format === "pdf";

      if (platformAdapter.isTauri()) {
        const path = await withVisibility(() =>
          platformAdapter.saveFileDialog({
            defaultPath: filename,
            filters: [
              {
                name:
                  reportData.format === "html"
                    ? "HTML"
                    : reportData.format === "pdf"
                    ? "PDF"
                    : "Markdown",
                extensions: [extension.slice(1)],
              },
            ],
          })
        );

        if (!path) return;

        if (isPdf) {
          const contentBase64 = view.serverId
            ? (
                await platformAdapter.commands<{
                  content_base64: string;
                }>("fetch_attachment_binary", {
                  serverId: view.serverId,
                  path: toServerPath(reportUrl),
                })
              ).content_base64
            : arrayBufferToBase64(
                await (await fetchReportBlob(reportUrl, view.serverId)).arrayBuffer()
              );
          await platformAdapter.commands("write_binary_file", {
            path,
            contentBase64,
          });
        } else {
          const content = await fetchReportText(reportUrl, view.serverId);
          await platformAdapter.commands("write_text_file", {
            path,
            content,
          });
        }
        addError(t("deepResearch.report.downloadSuccess"), "info");
        return;
      }

      const blob = isPdf
        ? await fetchReportBlob(reportUrl, view.serverId)
        : new Blob([await fetchReportText(reportUrl, view.serverId)], {
            type: getReportMimeType(reportData.format),
          });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      addError(t("deepResearch.report.downloadSuccess"), "info");
    } catch (e) {
      console.error("download research report failed", e);
      addError(t("deepResearch.report.downloadFailed"), "error");
    }
  }, [addError, reportUrl, t, view.reportData, view.serverId, withVisibility]);

  const tabs: { key: DeepResearchTabKey; label: string }[] = useMemo(
    () => [
      { key: "report", label: t("deepResearch.tab.report") },
      { key: "steps", label: t("deepResearch.tab.steps") },
      { key: "searchResults", label: t("deepResearch.tab.searchResults") },
    ],
    [t]
  );

  return (
    <div
      className={clsx(
        payload.theme === "dark" ? "dark" : "",
        "h-full w-full",
        className
      )}
    >
      <div className="flex h-full w-full flex-col bg-white text-[13px] text-[#333] dark:bg-black dark:text-[#E5E7EB]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0 border-b border-[#F0F0F0] dark:border-[#303030]">
          <div className="inline-flex items-center p-[3px] gap-[3px] border border-[#F0F0F0] dark:border-[#303030] rounded-[6px]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`h-[28px] px-3 rounded-[6px] text-[13px] leading-none transition-colors ${
                  activeTab === tab.key
                    ? "bg-[rgba(1,138,229,0.09)] dark:bg-[rgba(100,181,246,0.2)] text-[#1784FC] dark:text-[#7EC2FF]"
                    : "bg-white dark:bg-black text-[#333] dark:text-[#E5E7EB] hover:text-[#1784FC] dark:hover:text-[#7EC2FF]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "report" && reportUrl && (
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 h-7 rounded-md text-xs bg-[#E9F0FE] dark:bg-blue-900/30 text-[#1784FC] dark:text-blue-400 hover:opacity-80"
                onClick={handleDownloadReport}
              >
                <Download className="w-3.5 h-3.5" />
                {t("deepResearch.button.download")}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                aria-label={t("common.close", { defaultValue: "Close" })}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#666] hover:bg-[#F3F4F6] hover:text-[#111827] dark:text-[#A6A6A6] dark:hover:bg-[#111827] dark:hover:text-white"
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div
          className={clsx(
            "flex-1 min-h-0 px-4 pb-4 pt-3",
            activeTab === "report" && view.reportData?.format === "pdf"
              ? "overflow-hidden"
              : "overflow-y-auto custom-scrollbar"
          )}
        >
          {mountedTabs.report && (
            <div
              hidden={activeTab !== "report"}
              className={
                view.reportData?.format === "pdf" ? "h-full" : undefined
              }
            >
              <ResearchReportContent
                data={view.reportData}
                endChunk={view.endChunk}
                serverId={view.serverId}
                t={t}
              />
            </div>
          )}
          {mountedTabs.steps && (
            <div hidden={activeTab !== "steps"}>
              <ResearchStepsContent
                steps={view.steps}
                plannerStatus={view.plannerStatus}
                executionStatus={view.executionStatus}
                reportStatus={view.reportStatus}
                isEnd={view.isEnd}
                t={t}
              />
            </div>
          )}
          {mountedTabs.searchResults && (
            <div hidden={activeTab !== "searchResults"}>
              <ResearchSearchResultsContent
                hits={view.searchHits}
                theme={payload.theme}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
