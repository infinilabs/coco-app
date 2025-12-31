import { useMemo } from "react";

import { useSearchStore } from "@/stores/searchStore";
import { useExtensionStore } from "@/stores/extensionStore";

export const useCanNavigateBack = () => {
  const {
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    sourceData,
  } = useSearchStore();
  
  const { viewExtensionOpened } = useExtensionStore.getState();

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
