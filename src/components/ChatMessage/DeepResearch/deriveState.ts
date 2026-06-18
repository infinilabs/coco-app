import type { IChunkData } from "@/types/chat";
import type {
  DeepResearchState,
  StepItem,
  StepStatus,
  StepSearch,
  StepSearchStatus,
  StepSearchHit,
} from "./types";
import { normalizeResearchReportData, parseMaybeJson } from "./payload";

/**
 * 从原始 chunk 数组派生深度研究展示状态。
 * 与 coco-server 的 deriveDeepResearchState 保持完全一致的逻辑，
 * 供聊天内卡片与独立详情窗口共用。
 */
export const deriveDeepResearchState = (
  chunks: IChunkData[]
): DeepResearchState => {
  const state: DeepResearchState = {
    deepResearchPlans: [],
    deepResearchCurrentStepIndex: -1,
    deepResearchCurrentStepFinished: false,
    deepResearchQuery: "",
    deepResearchResultCount: undefined,
    deepResearchPlannerStarted: false,
    deepResearchResearcherStarted: false,
    deepResearchReporterStarted: false,
    deepResearchReporterFinished: false,
    deepResearchReportData: undefined,
    deepResearchSearchMap: {},
  };

  chunks.forEach((chunkData) => {
    if (chunkData.chunk_type === "research_planner_start") {
      state.deepResearchPlans = [];
      state.deepResearchCurrentStepIndex = -1;
      state.deepResearchCurrentStepFinished = false;
      state.deepResearchQuery = "";
      state.deepResearchResultCount = undefined;
      state.deepResearchPlannerStarted = true;
      state.deepResearchResearcherStarted = false;
      state.deepResearchReporterStarted = false;
      state.deepResearchReporterFinished = false;
      state.deepResearchReportData = undefined;
      state.deepResearchSearchMap = {};
      return;
    }

    if (chunkData.chunk_type === "research_planner_end") {
      if (typeof chunkData.message_chunk === "string") {
        try {
          const payload = parseMaybeJson(chunkData.message_chunk) as any;
          if (Array.isArray(payload)) {
            const plans = payload.map((item) => String(item));
            state.deepResearchPlans = plans;
            state.deepResearchCurrentStepIndex = plans.length > 0 ? 0 : -1;
          }
          state.deepResearchPlannerStarted = false;
        } catch (error) {
          console.error(error);
        }
      }
      return;
    }

    if (chunkData.chunk_type === "research_researcher_start") {
      if (
        typeof chunkData.message_chunk === "string" &&
        chunkData.message_chunk
      ) {
        try {
          const payload = parseMaybeJson(chunkData.message_chunk) as any;
          const planText =
            typeof payload?.plan === "string" ? payload.plan : "";
          if (planText) {
            state.deepResearchResearcherStarted = true;
            state.deepResearchCurrentStepFinished = false;

            let index = state.deepResearchPlans.findIndex(
              (title) => title === planText
            );

            // If plan not found, add it to the list
            if (index === -1) {
              state.deepResearchPlans.push(planText);
              index = state.deepResearchPlans.length - 1;
            }

            state.deepResearchCurrentStepIndex = index;
          }
        } catch (error) {
          console.error(error);
        }
      }
      return;
    }

    if (chunkData.chunk_type === "research_researcher_step_start") {
      if (
        typeof chunkData.message_chunk === "string" &&
        chunkData.message_chunk
      ) {
        try {
          const payload = parseMaybeJson(chunkData.message_chunk) as any;
          const planText =
            typeof payload?.plan === "string" ? payload.plan : "";
          const stepQuery = payload?.step?.payload?.query;

          // Ensure plan exists in state if not already
          if (planText && !state.deepResearchPlans.includes(planText)) {
            state.deepResearchPlans.push(planText);
            if (state.deepResearchCurrentStepIndex === -1) {
              state.deepResearchCurrentStepIndex =
                state.deepResearchPlans.length - 1;
            }
          }

          if (typeof stepQuery === "string") {
            state.deepResearchQuery = stepQuery;
          }
          state.deepResearchResultCount = undefined;
          if (planText && typeof stepQuery === "string") {
            const prevInfo = state.deepResearchSearchMap[planText] ?? {};
            state.deepResearchSearchMap[planText] = {
              ...prevInfo,
              query: stepQuery,
            };
          }
        } catch (error) {
          console.error(error);
        }
      }
      return;
    }

    if (chunkData.chunk_type === "research_researcher_step_end") {
      if (
        typeof chunkData.message_chunk === "string" &&
        chunkData.message_chunk
      ) {
        try {
          const payload = parseMaybeJson(chunkData.message_chunk) as any;
          const planText =
            typeof payload?.plan === "string" ? payload.plan : "";
          const hits = payload?.step?.payload?.hits;
          if (Array.isArray(hits)) {
            state.deepResearchResultCount = hits.length;
            if (planText) {
              const prevInfo = state.deepResearchSearchMap[planText] ?? {};
              state.deepResearchSearchMap[planText] = {
                ...prevInfo,
                resultCount: hits.length,
                hits: hits,
              };
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
      return;
    }

    if (chunkData.chunk_type === "research_researcher_end") {
      state.deepResearchQuery = "";
      state.deepResearchCurrentStepFinished = true;
      return;
    }

    if (chunkData.chunk_type === "research_reporter_start") {
      state.deepResearchReporterStarted = true;
      return;
    }

    if (chunkData.chunk_type === "research_reporter_end") {
      state.deepResearchReporterStarted = true;
      state.deepResearchReporterFinished = true;
      if (
        typeof chunkData.message_chunk === "string" &&
        chunkData.message_chunk
      ) {
        try {
          state.deepResearchReportData = normalizeResearchReportData(
            chunkData.message_chunk
          );
        } catch (error) {
          console.error(error);
        }
      }
    }
  });

  return state;
};

/** 把派生状态转换成步骤列表（供「步骤」tab 渲染） */
export const buildSteps = (state: DeepResearchState): StepItem[] => {
  const {
    deepResearchPlans,
    deepResearchReporterFinished,
    deepResearchReporterStarted,
    deepResearchResearcherStarted,
    deepResearchSearchMap,
    deepResearchCurrentStepIndex,
    deepResearchCurrentStepFinished,
  } = state;

  if (!deepResearchPlans.length) return [];

  return deepResearchPlans.map((title, index) => {
    let status: StepStatus = "pending";

    if (deepResearchReporterFinished || deepResearchReporterStarted) {
      status = "done";
    } else if (deepResearchResearcherStarted) {
      if (index < deepResearchCurrentStepIndex) {
        status = "done";
      } else if (index === deepResearchCurrentStepIndex) {
        status = deepResearchCurrentStepFinished ? "done" : "in_progress";
      }
    }

    const searchInfo = deepResearchSearchMap[title];
    const searches: StepSearch[] | undefined = searchInfo?.query
      ? [
          {
            id: `step-${index + 1}-search-1`,
            query: searchInfo.query,
            resultCount: searchInfo.resultCount,
            status:
              typeof searchInfo.resultCount === "number"
                ? ("done" as StepSearchStatus)
                : ("searching" as StepSearchStatus),
            hits: searchInfo.hits,
          },
        ]
      : undefined;

    return {
      id: `step-${index + 1}`,
      title,
      status,
      searches,
      showOptimizePlan: false,
    };
  });
};

/** 汇总所有步骤的搜索命中（供「搜索结果」tab 渲染） */
export const buildSearchHits = (state: DeepResearchState): StepSearchHit[] => {
  const allHits: StepSearchHit[] = [];
  Object.values(state.deepResearchSearchMap).forEach((info) => {
    if (info.hits && Array.isArray(info.hits)) {
      allHits.push(...info.hits);
    }
  });
  return allHits;
};

/** 三阶段状态（规划 / 执行 / 报告），供「步骤」tab 头部图标渲染 */
export const buildStatuses = (
  state: DeepResearchState,
  steps: StepItem[]
): {
  plannerStatus: StepStatus;
  executionStatus: StepStatus;
  reportStatus: StepStatus;
} => {
  const reportStatus: StepStatus = state.deepResearchReporterFinished
    ? "done"
    : state.deepResearchReporterStarted
    ? "in_progress"
    : "pending";

  const plannerStatus: StepStatus = state.deepResearchPlans.length
    ? "done"
    : state.deepResearchPlannerStarted
    ? "in_progress"
    : "pending";

  let executionStatus: StepStatus = "pending";
  if (steps.length) {
    if (steps.some((step) => step.status === "in_progress")) {
      executionStatus = "in_progress";
    } else if (steps.some((step) => step.status === "done")) {
      executionStatus = "done";
    }
  }

  return { plannerStatus, executionStatus, reportStatus };
};
