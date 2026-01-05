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
  
  const viewExtensionOpened = useExtensionStore((state) =>
    state.viewExtensions.length > 0
      ? state.viewExtensions[state.viewExtensions.length - 1]
      : undefined
  );

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
