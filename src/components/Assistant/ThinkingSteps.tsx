import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";

interface ThinkingStepsProps {
  currentStep?: number;
}

export const ThinkingSteps = ({ currentStep = 4 }: ThinkingStepsProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  const steps = [
    "Understand the query",
    "Retrieve documents",
    "Intelligent pre-selection",
    "Deep reading",
  ];

  return (
    <div
      className={`mt-2 ${
        isExpanded
          ? "rounded-lg overflow-hidden border border-[#E6E6E6] dark:border-[#272626]"
          : ""
      }`}
    >
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`inline-flex justify-between items-center gap-2 px-2 py-1 rounded-xl transition-colors ${
          isExpanded
            ? "w-full"
            : "border border-[#E6E6E6] dark:border-[#272626]"
        }`}
      >
        <div className="flex gap-2">
          <Brain className="w-4 h-4 text-[#999999]" />
          <span className="text-xs text-[#999999]">
            {t("assistant.message.thinking")}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#999999]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#999999]" />
        )}
      </button>

      {isExpanded && (
        <div className="p-2 space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 hover:bg-[#F7F7F7] dark:hover:bg-[#2C2C2C] border-b border-[#E6E6E6] dark:border-[#272626] last:border-b-0"
            >
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
                  `assistant.message.steps.${step
                    .toLowerCase()
                    .replace(/\s+/g, "_")}`
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
