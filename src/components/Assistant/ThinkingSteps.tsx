import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ThinkingStepsProps {
  currentStep?: number;
}

interface StepDetail {
  title: string;
  type: string;
  content?: string;
}

// QueryIntent  = "query_intent" 
// QueryRewrite = "query_rewrite" //
// FetchDetail  = "fetch_detail" // 
// References   = "references" //

// Think        = "think" //reasoning message by LLM
// Response     = "response" //formal response by assistant
// FetchSource  = "fetch_source"
// PickSource   = "pick_source"
// ReplyEnd     = "reply_end"

export const ThinkingSteps = ({ currentStep = 4 }: ThinkingStepsProps) => {
  const { t } = useTranslation();
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);

  const steps: StepDetail[] = [
    {
      title: "Understand the query",
      content: "...",
      type: "query_intent"
    },
    {
      title: "Retrieve documents",
      content: "...",
      type: "fetch_source"
    },
    {
      title: "Intelligent pre-selection",
      content: "...",
      type: "pick_source"
    },
    {
      title: "Deep reading",
      content: "...",
      type: "think"
    },
  ];

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="mt-2 space-y-2">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`rounded-lg overflow-hidden ${
            expandedSteps.includes(index)
              ? "border border-[#E6E6E6] dark:border-[#272626]"
              : ""
          }`}
        >
          <button
            onClick={() => toggleStep(index)}
            className={`w-full inline-flex justify-between items-center gap-2 px-2 py-1 rounded-xl transition-colors ${
              !expandedSteps.includes(index)
                ? "border border-[#E6E6E6] dark:border-[#272626]"
                : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  index < currentStep - 1
                    ? "bg-[#22C493]"
                    : "border-2 border-[#0072FF]"
                } flex items-center justify-center flex-shrink-0`}
              >
                {index < currentStep - 1 ? (
                  <span className="text-white text-xs">✓</span>
                ) : (
                  <span className="text-[#0072FF] text-xs animate-pulse">
                    ⋯
                  </span>
                )}
              </div>
              <span className="text-xs text-[#333333] dark:text-[#D8D8D8]">
                {t(
                  `assistant.message.steps.${step.title
                    .toLowerCase()
                    .replace(/\s+/g, "_")}`
                )}
              </span>
            </div>
            {expandedSteps.includes(index) ? (
              <ChevronUp className="w-4 h-4 text-[#999999]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#999999]" />
            )}
          </button>

          {expandedSteps.includes(index) && step.content && (
            <div className="p-2 border-t border-[#E6E6E6] dark:border-[#272626]">
              <div className="text-xs text-[#8b8b8b] dark:text-[#a6a6a6]">
                {step.content}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
