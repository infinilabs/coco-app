import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type TFunction } from "i18next";
import { Hourglass, BookOpen, Search, Square, Ban, Check, X } from "lucide-react";
import { nanoid } from "nanoid";

import type { IChunkData } from "@/types/chat";
import { useConnectStore } from "@/stores/connectStore";
import { deriveDeepResearchState } from "./deriveState";
import type { DeepResearchEndChunk, ResearchReportData } from "./types";
import { resolveReportUrl } from "./resolveReportUrl";
import { DeepResearchCancelDialog } from "./DeepResearchCancelDialog";
import type {
  DeepResearchPanelPayload,
  DeepResearchTabKey,
} from "./DeepResearchPanel";

export interface DeepResearchProps {
  detail?: { type: string; payload?: IChunkData[] };
  endChunk?: DeepResearchEndChunk;
  ChunkData?: IChunkData[];
  question?: string;
  formatUrl?: (data: any) => string;
  theme?: "light" | "dark";
  t?: TFunction;
  payload?: ResearchReportData;
  onCancel?: () => void;
  /** 用于独立详情窗口回拉历史的兜底参数 */
  sessionId?: string;
  messageId?: string;
  activeDetailViewKey?: string;
  onOpenDetail?: (payload: DeepResearchPanelPayload) => void;
  onUpdateDetail?: (payload: DeepResearchPanelPayload) => void;
  onRequestCancel?: () => void;
}

export const DeepResearch = ({
  detail,
  endChunk,
  ChunkData = [],
  question,
  formatUrl,
  theme,
  t: tProp,
  payload,
  onCancel,
  sessionId,
  messageId,
  activeDetailViewKey,
  onOpenDetail,
  onUpdateDetail,
  onRequestCancel,
}: DeepResearchProps) => {
  const { t: tOriginal, i18n } = useTranslation();
  const t = tProp || tOriginal;
  const serverId = useConnectStore((state) => state.currentService?.id);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // 本卡片实例的唯一标识，用于判断当前是否由“我”掌控详情窗
  const instanceIdRef = useRef<string>(nanoid());

  // 合并历史持久化 chunks（detail.payload）与实时流式 chunks（ChunkData）
  const allChunks = useMemo(() => {
    const saved = detail?.payload ?? [];
    if (ChunkData.length > 0) return ChunkData;
    return saved;
  }, [detail?.payload, ChunkData]);

  const state = useMemo(
    () => deriveDeepResearchState(allChunks),
    [allChunks]
  );

  const {
    deepResearchPlans,
    deepResearchCurrentStepIndex,
    deepResearchQuery,
    deepResearchResultCount,
    deepResearchResearcherStarted,
    deepResearchReporterStarted,
    deepResearchReporterFinished,
    deepResearchReportData,
  } = state;

  const hasDeepResearchPlan =
    deepResearchPlans.length > 0 &&
    deepResearchCurrentStepIndex >= 0 &&
    deepResearchCurrentStepIndex < deepResearchPlans.length;

  const stepTitle = hasDeepResearchPlan
    ? deepResearchPlans[deepResearchCurrentStepIndex]
    : "";
  const isCompleted = endChunk?.payload?.reason === "completed";
  const isCancelled = endChunk?.payload?.reason === "user_cancelled";
  const isError = endChunk?.payload?.reason === "error";
  const isTimeout = endChunk?.payload?.reason === "timeout";
  const isEnd = isCompleted || isCancelled || isError || isTimeout;
  const isReportPhase = deepResearchReporterStarted || deepResearchReporterFinished;
  const isExecutionPhase =
    !isReportPhase && deepResearchResearcherStarted && hasDeepResearchPlan;
  const cardHeaderTitle = isCompleted
    ? t("deepResearch.status.reportHeader")
    : isReportPhase
    ? t("deepResearch.steps.reportTitle")
    : isExecutionPhase
    ? stepTitle
    : deepResearchPlans.length > 0
    ? t("deepResearch.steps.planTitle")
    : "——";

  const deepResearchPlanningProgress = deepResearchPlans.length > 0 ? 1 : 0;
  const deepResearchExecutionProgress = hasDeepResearchPlan
    ? (deepResearchCurrentStepIndex + 1) / deepResearchPlans.length
    : 0;
  const deepResearchReportProgress = deepResearchReporterFinished
    ? 1
    : deepResearchReporterStarted
    ? 0.5
    : 0;

  const progress =
    (deepResearchPlanningProgress +
      deepResearchExecutionProgress +
      deepResearchReportProgress) /
    3;

  const mergedPayload = payload || deepResearchReportData;

  const statusText = useMemo(() => {
    if (endChunk?.payload?.reason === "completed") {
      return mergedPayload?.title || t("deepResearch.status.completed");
    } else if (deepResearchReporterFinished) {
      if (typeof deepResearchResultCount === "number") {
        return t("deepResearch.status.completedWithCount", {
          count: deepResearchResultCount,
        });
      }
      return t("deepResearch.status.completed");
    }
    if (deepResearchReporterStarted) {
      return t("deepResearch.report.generatingTitle");
    }
    if (deepResearchResearcherStarted) {
      return t("deepResearch.status.executingPlan");
    }
    if (deepResearchPlans.length > 0) {
      return t("deepResearch.status.planningResearch");
    }
    return undefined;
  }, [
    deepResearchReporterFinished,
    deepResearchResultCount,
    deepResearchReporterStarted,
    deepResearchResearcherStarted,
    deepResearchPlans.length,
    endChunk,
    mergedPayload,
    t,
  ]);

  const normalizedProgress = useMemo(() => {
    if (typeof progress !== "number" || Number.isNaN(progress)) return 0;
    if (progress < 0) return 0;
    if (progress > 1) return 1;
    return progress;
  }, [progress]);

  const displayStatus = useMemo(() => {
    if (statusText) return statusText;
    if (normalizedProgress >= 1) {
      if (typeof deepResearchResultCount === "number") {
        return t("deepResearch.status.completedWithCount", {
          count: deepResearchResultCount,
        });
      }
      return t("deepResearch.status.completed");
    }
    if (normalizedProgress > 0) {
      return t("deepResearch.status.running");
    }
    return t("deepResearch.status.preparing");
  }, [statusText, normalizedProgress, deepResearchResultCount, t]);

  const viewKey = `${sessionId || "session"}:${messageId || instanceIdRef.current}`;

  const createDetailPayload = (
    defaultTab: DeepResearchTabKey
  ): DeepResearchPanelPayload => {
    const reportData =
      mergedPayload && mergedPayload.url
        ? {
            ...mergedPayload,
            url: resolveReportUrl(mergedPayload.url, formatUrl),
          }
        : mergedPayload;

    return {
      viewKey,
      chunks: allChunks,
      defaultTab,
      reportData,
      endChunk,
      question,
      theme,
      language: i18n.resolvedLanguage || i18n.language,
      serverId,
    };
  };

  useEffect(() => {
    if (activeDetailViewKey !== viewKey) return;
    onUpdateDetail?.(createDetailPayload(isCompleted ? "report" : "steps"));
  }, [allChunks, endChunk, mergedPayload, activeDetailViewKey, viewKey]);

  const openDetailWindow = (tab: DeepResearchTabKey) => {
    onOpenDetail?.(createDetailPayload(tab));
  };

  if (!allChunks.length) {
    return null;
  }

  return (
    <>
      <div
        className="w-full my-3 cursor-pointer"
        onClick={() => {
          void openDetailWindow(isCompleted ? "report" : "steps");
        }}
      >
        <div className="w-full rounded-[8px] border border-[#F0F0F0] dark:border-[#303030] bg-[#F3F4F6] dark:bg-[#020817] p-4">
          <div className="flex items-center gap-2 mb-4">
            {isCompleted ? (
              <>
                <BookOpen className="h-4 w-4 text-[#148EFF] shrink-0" />
                <div className="text-[14px] leading-[24px] font-medium text-[#333] dark:text-[#E5E7EB] truncate">
                  {t("deepResearch.status.reportHeader")}
                </div>
              </>
            ) : (
              <>
                <Hourglass
                  className={`h-4 w-4 text-[#148EFF] shrink-0 ${
                    isEnd ? "" : "animate-spin"
                  }`}
                />
                <div className="text-sm font-medium text-[#333] dark:text-[#E5E7EB] truncate">
                  {cardHeaderTitle}
                </div>
              </>
            )}
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 mb-4 text-[#999] leading-[20px]">
              {t("deepResearch.status.reportDescription")}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between rounded-[4px] bg-white px-3 py-2 text-sm text-[#333] dark:bg-[#111827] dark:text-[#D1D5DB]">
            <div className="flex min-w-0 items-center gap-2 flex-1">
              {isCompleted || isReportPhase ? (
                <BookOpen className="h-4 w-4 shrink-0 text-[#148EFF]" />
              ) : (
                <Search className="h-4 w-4 text-[#148EFF] shrink-0" />
              )}
              <div className="flex min-w-0 items-center flex-1">
                <span className="whitespace-nowrap shrink-0">{displayStatus}</span>
                {!isCompleted && (deepResearchQuery || question) && (
                  <span className="text-[#999] dark:text-[#A6A6A6] truncate ml-1">
                    ｜ {deepResearchQuery || question}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-2 flex items-center gap-2 shrink-0">
              {normalizedProgress < 1 &&
              typeof deepResearchResultCount === "number" ? (
                <div className="min-w-[24px] flex px-1 items-center justify-center rounded-[12px] border border-solid border-[rgba(1,138,229,0.21)] bg-transparent text-xs font-medium text-[#1784FC] dark:text-[#7EC2FF]">
                  {deepResearchResultCount}
                </div>
              ) : null}
              {normalizedProgress >= 1 && (
                <button
                  type="button"
                  className="px-3 py-1 text-xs font-medium rounded-full bg-[#E9F0FE] dark:bg-blue-900/30 text-[#1784FC] dark:text-blue-400 hover:bg-[#E0E9FD] dark:hover:bg-blue-900/50 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetailWindow("report");
                  }}
                >
                  {t("deepResearch.button.view")}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 w-full flex items-center gap-2 overflow-hidden">
            <div className="h-2 rounded-full flex-1 items-center bg-white dark:bg-[#1F2937]">
              <div
                className={`h-full rounded-full transition-all ${
                  isCancelled
                    ? "bg-[#999]"
                    : isError || isTimeout
                    ? "bg-[#F04444]"
                    : normalizedProgress >= 1
                    ? "bg-[#00C868]"
                    : "bg-[#1784FC]"
                }`}
                style={{ width: `${normalizedProgress * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-center">
              {isCancelled ? (
                <Ban className="h-4 w-4 text-[#999]" />
              ) : isError || isTimeout ? (
                <X className="h-4 w-4 text-[#F04444]" />
              ) : isCompleted && normalizedProgress >= 1 ? (
                <Check className="h-4 w-4 text-[#22C55E]" />
              ) : (
                <button
                  type="button"
                  className="border-0 flex items-center justify-center rounded-full shrink-0 cursor-pointer bg-[#0072FF] transition-colors"
                  style={{ width: "16px", height: "16px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRequestCancel) {
                      onRequestCancel();
                    } else {
                      setCancelDialogOpen(true);
                    }
                  }}
                  title={t("labels.stop")}
                >
                  <Square
                    size={6}
                    strokeWidth={2}
                    className="text-white fill-white"
                    aria-label={t("labels.stop")}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <DeepResearchCancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={onCancel}
        t={t}
      />
    </>
  );
};
