import { useSearchStore } from "@/stores/searchStore";
import { useMemo } from "react";

export const useCanNavigateBack = () => {
  const {
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    viewExtensionOpened,
    sourceData,
    cameraOpened,
  } = useSearchStore();

  const canNavigateBack = useMemo(() => {
    return (
      goAskAi ||
      visibleExtensionStore ||
      visibleExtensionDetail ||
      viewExtensionOpened ||
      sourceData ||
      cameraOpened
    );
  }, [
    goAskAi,
    visibleExtensionStore,
    visibleExtensionDetail,
    viewExtensionOpened,
    sourceData,
    cameraOpened,
  ]);

  return { canNavigateBack };
};
