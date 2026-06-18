import type { DeepResearchEndChunk, ResearchReportData } from "./types";

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const parseMaybeJson = (value: unknown): unknown => {
  let parsed = value;

  for (let index = 0; index < 2; index += 1) {
    if (typeof parsed !== "string") return parsed;

    const text = parsed.trim();
    if (!text) return undefined;

    try {
      parsed = JSON.parse(text);
    } catch {
      return parsed;
    }
  }

  return parsed;
};

const getNestedRecord = (value: RecordValue, key: string) => {
  const nested = value[key];
  const parsed = parseMaybeJson(nested);
  return isRecord(parsed) ? parsed : undefined;
};

const looksLikeReportData = (value: RecordValue) => {
  return (
    typeof value.url === "string" ||
    typeof value.attachment === "string" ||
    typeof value.content === "string" ||
    typeof value.title === "string"
  );
};

export const normalizeResearchReportData = (
  value: unknown
): ResearchReportData | undefined => {
  const parsed = parseMaybeJson(value);

  if (typeof parsed === "string") {
    const text = parsed.trim();
    if (!text) return undefined;

    if (/^(https?:\/\/|\/|files?\/|attachments?\/)/i.test(text)) {
      return { url: text };
    }

    return undefined;
  }

  if (!isRecord(parsed)) return undefined;

  const candidates = [
    parsed,
    getNestedRecord(parsed, "payload"),
    getNestedRecord(parsed, "data"),
    getNestedRecord(parsed, "result"),
    getNestedRecord(parsed, "report"),
    getNestedRecord(parsed, "report_data"),
  ].filter((item): item is RecordValue => Boolean(item));

  const report = candidates.find(looksLikeReportData);
  if (!report) return undefined;

  const url =
    typeof report.url === "string"
      ? report.url
      : typeof report.attachment === "string"
        ? report.attachment
        : undefined;

  return {
    ...report,
    title: typeof report.title === "string" ? report.title : undefined,
    url,
    created: typeof report.created === "string" ? report.created : undefined,
    attachment:
      typeof report.attachment === "string" ? report.attachment : undefined,
    format: typeof report.format === "string" ? report.format : undefined,
    content: typeof report.content === "string" ? report.content : undefined,
  };
};

export const parseReplyEndPayload = (
  value: unknown
): DeepResearchEndChunk["payload"] | undefined => {
  const parsed = parseMaybeJson(value);

  if (isRecord(parsed)) {
    const payload = isRecord(parsed.payload) ? parsed.payload : parsed;
    const reason = payload.reason;

    return {
      ...payload,
      reason:
        reason === "completed" ||
        reason === "user_cancelled" ||
        reason === "error" ||
        reason === "timeout"
          ? reason
          : undefined,
    };
  }

  if (typeof parsed !== "string") return undefined;

  const text = parsed.trim().toLowerCase();
  if (!text) return undefined;
  if (text.includes("cancel")) return { reason: "user_cancelled" };
  if (text.includes("timeout")) return { reason: "timeout" };
  if (text.includes("error") || text.includes("failed")) {
    return { reason: "error", error: parsed };
  }
  if (text.includes("completed") || text.includes("complete")) {
    return { reason: "completed" };
  }

  return undefined;
};
