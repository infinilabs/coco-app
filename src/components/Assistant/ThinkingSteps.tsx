import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ThinkingStepsProps {
  currentStep?: number;
}

interface StepDetail {
  title: string;
  content?: string;
}

export const ThinkingSteps = ({ currentStep = 4 }: ThinkingStepsProps) => {
  const { t } = useTranslation();
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);

  const steps: StepDetail[] = [
    {
      title: "Understand the query",
      content: "草坪晚上浇水失去的水分，这导致水资源浪费。建议改变浇水时间：200-300毫升。",
    },
    {
      title: "Retrieve documents",
      content: "检索相关文档中...",
    },
    {
      title: "Intelligent pre-selection",
      content: "智能预选相关内容...",
    },
    {
      title: "Deep reading",
      content: "深度阅读分析中...",
    },
  ];

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
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
                  <span className="text-[#0072FF] text-xs animate-pulse">⋯</span>
                )}
              </div>
              <span className="text-xs text-[#333333] dark:text-[#D8D8D8]">
                {t(`assistant.message.steps.${step.title.toLowerCase().replace(/\s+/g, "_")}`)}
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
