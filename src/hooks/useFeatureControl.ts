import { useState, useEffect } from "react";

import { useConnectStore } from "@/stores/connectStore";

interface UseFeatureControlProps {
  initialFeatures: string[];
  featureToToggle: string;
  condition: (assistant: any) => boolean;
}

export const useFeatureControl = ({
  initialFeatures,
  featureToToggle,
  condition,
}: UseFeatureControlProps) => {
  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const [features, setFeatures] = useState<string[]>(initialFeatures);

  useEffect(() => {
    if (condition(currentAssistant)) {
      setFeatures((prev) => prev.filter((feature) => feature !== featureToToggle));
    } else {
      setFeatures((prev) => {
        if (!prev.includes(featureToToggle)) {
          return [...prev, featureToToggle];
        }
        return prev;
      });
    }
  }, [JSON.stringify(currentAssistant), featureToToggle]);

  return features;
};