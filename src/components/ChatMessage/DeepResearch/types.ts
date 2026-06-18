/**
 * 步骤状态类型定义
 * done: 已完成 | in_progress: 进行中 | pending: 等待中
 */
export type StepStatus = "done" | "in_progress" | "pending";

/**
 * 搜索状态类型定义
 * done: 搜索完成 | searching: 正在搜索
 */
export type StepSearchStatus = "done" | "searching";

/** 搜索结果条目 */
export interface StepSearchHit {
  source?: string;
  title: string;
  url?: string;
  content?: string;
  score?: number;
}

/** 搜索任务 */
export interface StepSearch {
  id: string;
  query: string;
  resultCount?: number;
  status: StepSearchStatus;
  note?: string;
  hits?: StepSearchHit[];
}

/** 研究步骤条目 */
export interface StepItem {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
  searches?: StepSearch[];
  showOptimizePlan?: boolean;
}

/** 最终研究报告数据 */
export interface ResearchReportData {
  title?: string;
  url?: string;
  created?: string;
  attachment?: string;
  format?: string;
  content?: string;
}

/** 从 chunk 数组派生出的深度研究展示状态 */
export interface DeepResearchState {
  deepResearchPlans: string[];
  deepResearchCurrentStepIndex: number;
  deepResearchCurrentStepFinished: boolean;
  deepResearchQuery: string;
  deepResearchResultCount: number | undefined;
  deepResearchPlannerStarted: boolean;
  deepResearchResearcherStarted: boolean;
  deepResearchReporterStarted: boolean;
  deepResearchReporterFinished: boolean;
  deepResearchReportData: ResearchReportData | undefined;
  deepResearchSearchMap: Record<
    string,
    { query?: string; resultCount?: number; hits?: StepSearchHit[] }
  >;
}

export type DeepResearchEndReason =
  | "completed"
  | "user_cancelled"
  | "error"
  | "timeout";

export interface DeepResearchEndChunk {
  type?: string;
  payload?: {
    reason?: DeepResearchEndReason;
    error?: string;
    type?: string;
    title?: string;
    [key: string]: any;
  };
}
