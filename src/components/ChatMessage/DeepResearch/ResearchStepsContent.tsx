import {
  Search,
  FileText,
  ChevronDown,
  BookOpen,
  List,
  ChevronUp,
  Hourglass,
  Check,
  SquarePen,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type TFunction } from "i18next";

import platformAdapter from "@/utils/platformAdapter";
import type { StepItem, StepStatus } from "./types";

interface ResearchStepsContentProps {
  steps?: StepItem[];
  plannerStatus?: StepStatus;
  executionStatus?: StepStatus;
  reportStatus?: StepStatus;
  isEnd?: boolean;
  t?: TFunction;
}

/**
 * 深度研究步骤内容组件
 * 展示研究计划、执行步骤和报告生成的全过程状态
 */
export const ResearchStepsContent = ({
  steps,
  plannerStatus,
  executionStatus,
  reportStatus,
  isEnd,
  t: tProp,
}: ResearchStepsContentProps) => {
  const { t: tOriginal } = useTranslation();
  const t = tProp || tOriginal;
  const data = steps ?? [];
  const [expandedSearches, setExpandedSearches] = useState<Set<string>>(
    new Set()
  );
  const [plansExpanded, setPlansExpanded] = useState(false);

  const toggleSearch = (searchId: string) => {
    setExpandedSearches((prev) => {
      const next = new Set(prev);
      if (next.has(searchId)) {
        next.delete(searchId);
      } else {
        next.add(searchId);
      }
      return next;
    });
  };

  const firstActiveIndex = data.findIndex((step) => step.status !== "pending");

  const lastActiveIndex = data.reduce(
    (lastIndex, step, index) => (step.status !== "pending" ? index : lastIndex),
    -1
  );

  const autoExecutionStatus: StepStatus = (() => {
    if (!data.length) return "pending";
    if (data.some((step) => step.status === "in_progress")) {
      return "in_progress";
    }
    if (data.every((step) => step.status === "done")) {
      return "done";
    }
    if (data.some((step) => step.status === "done")) {
      return "in_progress";
    }
    return "pending";
  })();

  const planner = plannerStatus ?? (data.length ? "done" : "pending");
  const execution = executionStatus ?? autoExecutionStatus;
  const report = reportStatus ?? "pending";

  return (
    <div className="space-y-4 pr-2">
      <div className="text-xs leading-5 text-[#333] dark:text-[#E5E7EB]">
        {t("deepResearch.steps.intro")}
      </div>

      {/* 计划生成阶段 */}
      <div className="space-y-3">
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            planner === "pending"
              ? "text-[#999] dark:text-[#666]"
              : "text-[#333] dark:text-[#E5E7EB]"
          }`}
        >
          {planner === "in_progress" ? (
            <Hourglass
              className={`w-4 h-4 text-[#1784FC] ${isEnd ? "" : "animate-spin"}`}
            />
          ) : (
            <SquarePen
              className={`w-4 h-4 ${
                planner === "pending" ? "text-[#999]" : "text-[#1784FC]"
              }`}
            />
          )}
          {t("deepResearch.steps.planTitle")}
        </div>
        <div className="text-[#999] dark:text-[#A6A6A6] text-xs leading-5 mb-1">
          {t("deepResearch.steps.planDescription")}
        </div>

        {/* 计划列表展开开关 */}
        <div
          className="border border-[#F0F0F0] dark:border-[#303030] rounded-md px-3 py-2 bg-transparent flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-[#111827] transition-colors"
          onClick={() => setPlansExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-2 text-xs text-[#333] dark:text-[#E5E7EB]">
            <List className="w-3.5 h-3.5 text-[#1784FC]" />
            {t("deepResearch.steps.generatedPlans")}
          </div>
          {plansExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>

        {/* 计划列表详情 */}
        {plansExpanded && data.length > 0 && (
          <div className="mt-2 space-y-1 rounded-md bg-transparent border border-[#F0F0F0] dark:border-[#303030] p-2.5">
            {data.map((step, index) => (
              <div key={step.id} className="flex items-start gap-2 text-xs leading-5">
                <span className="text-[#999] dark:text-[#A6A6A6]">
                  {index + 1}.
                </span>
                <span className="text-[#333] dark:text-[#E5E7EB]">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 执行阶段 */}
      <div className="">
        <div
          className={`flex items-center gap-2 text-sm font-medium mb-3 ${
            execution === "pending"
              ? "text-[#999] dark:text-[#666]"
              : "text-[#333] dark:text-[#E5E7EB]"
          }`}
        >
          <List className="w-4 h-4 text-[#1784FC]" />
          {t("deepResearch.steps.executeTitle")}
        </div>

        {/* 步骤列表渲染 */}
        {data.map((step, index) => {
          const isActive = step.status !== "pending";
          const isFirstActive = index === firstActiveIndex;
          const isLastActive = index === lastActiveIndex;

          const isSimplePending = step.status === "pending" && !step.searches;

          return (
            <div
              key={step.id}
              className={`relative ${
                isSimplePending ? "pl-0 pb-3" : "pl-5 pb-5 last:pb-0"
              }`}
            >
              {/* 步骤之间的连接虚线 */}
              {isActive &&
                firstActiveIndex !== -1 &&
                lastActiveIndex !== -1 && (
                  <div
                    className="absolute left-2 border-l border-dashed border-[#018AE5]/20 dark:border-gray-700"
                    style={{
                      top: isFirstActive ? 10 : 16,
                      bottom: isLastActive ? 10 : -12,
                    }}
                  />
                )}

              {/* 完成状态图标 */}
              {step.status === "done" && (
                <span className="absolute left-0 top-[2px] flex w-3.5 h-3.5 items-center justify-center rounded-full bg-[#1784FC]">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}

              {/* 进行中状态图标 */}
              {step.status === "in_progress" && (
                <Hourglass
                  className={`absolute left-0 top-[2px] w-3.5 h-3.5 text-[#1784FC] ${
                    isEnd ? "" : "animate-spin"
                  }`}
                />
              )}

              {/* 等待中的简化展示 */}
              {isSimplePending ? (
                <div className="flex items-center gap-2">
                  <List className="w-3.5 h-3.5 text-[#C8C8C8]" />
                  <div className="text-xs text-[#999999] dark:text-[#666]">
                    {step.title}
                  </div>
                </div>
              ) : (
                <>
                  {/* 步骤标题 */}
                  <h3
                    className={`text-xs leading-5 font-semibold mb-2 ${
                      step.status === "pending"
                        ? "text-[#999999] dark:text-[#666]"
                        : "text-[#333333] dark:text-[#E5E7EB]"
                    }`}
                  >
                    {step.title}
                  </h3>

                  {/* 步骤描述 */}
                  {step.description && (
                    <p className="text-[#999] dark:text-[#A6A6A6] text-xs leading-5 mb-2">
                      {step.description}
                    </p>
                  )}

                  {/* 搜索任务列表 */}
                  {step.searches && (
                    <div className="space-y-2">
                      {step.searches.map((search) =>
                        search.status === "searching" ? (
                          // 正在搜索状态
                          <div
                            key={search.id}
                            className="flex items-center justify-between border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 rounded-md px-3 py-2"
                          >
                            <div className="flex items-center gap-2 text-xs overflow-hidden">
                              <Search className="w-3.5 h-3.5 text-[#1784FC] animate-pulse shrink-0" />
                              <span className="text-[#333] dark:text-[#E5E7EB] shrink-0">
                                {t("deepResearch.steps.searching")}
                              </span>
                              {search.query && (
                                <span className="text-[#999] dark:text-[#A6A6A6] truncate">
                                  ｜ {search.query}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          // 搜索完成状态
                          <div key={search.id}>
                            <div
                              className="flex items-center justify-between border border-[#F0F0F0] dark:border-[#303030] rounded-md px-3 py-2 bg-transparent cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1F2937] transition-colors"
                              onClick={() => toggleSearch(search.id)}
                            >
                              <div className="flex items-center gap-2 text-xs overflow-hidden">
                                <Search className="w-3.5 h-3.5 text-[#1784FC] shrink-0" />
                                <span className="text-[#333] dark:text-[#E5E7EB] shrink-0">
                                  {t("deepResearch.steps.searchTitle")}
                                </span>
                                {search.query && (
                                  <span className="text-[#999] dark:text-[#A6A6A6] truncate">
                                    ｜ {search.query}
                                  </span>
                                )}
                              </div>
                              {typeof search.resultCount === "number" && (
                                <div className="flex items-center gap-1.5">
                                  <div className="min-w-[22px] flex px-1 items-center justify-center rounded-[12px] border border-solid border-[rgba(1,138,229,0.21)] bg-transparent text-[11px] font-medium text-[#1784FC] dark:text-[#7EC2FF]">
                                    {search.resultCount}
                                  </div>
                                  {expandedSearches.has(search.id) ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-[#999]" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-[#999]" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 展开的搜索结果详情 */}
                            {expandedSearches.has(search.id) && search.hits && (
                              <div className="mt-2 space-y-2 pl-3">
                                {search.hits.map((hit, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 bg-transparent border border-[#F0F0F0] dark:border-[#303030] rounded-md hover:border-[#1784FC] dark:hover:border-[#7EC2FF] transition-colors cursor-pointer group"
                                    onClick={() => {
                                      if (typeof hit.url === "string") {
                                        platformAdapter.openUrl(hit.url);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-[#333] dark:text-[#E5E7EB] group-hover:text-[#1784FC] transition-colors line-clamp-1">
                                          {hit.title}
                                        </div>
                                        {hit.content && (
                                          <div className="text-xs text-[#999] dark:text-[#A6A6A6] mt-1 line-clamp-2">
                                            {hit.content}
                                          </div>
                                        )}
                                      </div>
                                      {hit.url && (
                                        <SquareArrowOutUpRight className="shrink-0 size-3.5 text-[#999] dark:text-[#A6A6A6] group-hover:text-[#1784FC] dark:group-hover:text-[#7EC2FF] transition-colors" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {search.note && (
                              <p className="text-[#999] dark:text-[#A6A6A6] text-xs mt-3 mb-2">
                                {search.note}
                              </p>
                            )}
                          </div>
                        )
                      )}

                      {/* 优化计划提示 */}
                      {step.showOptimizePlan && (
                        <div className="border border-[#F0F0F0] dark:border-[#303030] rounded-md px-3 py-2 bg-transparent flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-[#111827] transition-colors">
                          <div className="flex items-center gap-2 text-xs">
                            <FileText className="w-3.5 h-3.5 text-[#1784FC]" />
                            <span className="text-[#333] dark:text-[#E5E7EB]">
                              {t("deepResearch.steps.optimizePlan")}
                            </span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-[#999]" />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* 报告生成阶段 */}
        <div className="">
          <div
            className={`flex items-center gap-2 text-sm font-medium mb-3 ${
              report === "pending"
                ? "text-[#999] dark:text-[#666]"
                : "text-[#333] dark:text-[#E5E7EB]"
            }`}
          >
            {report === "in_progress" ? (
              <Hourglass
                className={`w-4 h-4 text-blue-500 ${
                  isEnd ? "" : "animate-spin"
                }`}
              />
            ) : (
              <BookOpen
                className={`w-4 h-4 ${
                  report === "pending" ? "text-[#999]" : "text-[#1784FC]"
                }`}
              />
            )}
            {t("deepResearch.report.generatingTitle")}
          </div>
        </div>
      </div>
    </div>
  );
};
