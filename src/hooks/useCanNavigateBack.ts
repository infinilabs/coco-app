import { useSearchStore } from "@/stores/searchStore";
import { useMemo } from "react";

export const useCanNavigateBack = () => {
  const {
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    viewExtensionOpened,
    sourceData,
  } = useSearchStore();

  const canNavigateBack = useMemo(() => {
    return (
      goAskAi ||
      visibleExtensionStore ||
      visibleExtensionDetail ||
      viewExtensionOpened ||
      sourceData
    );
  }, [
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    viewExtensionOpened,
    sourceData,
  ]);

  return { canNavigateBack };
};
