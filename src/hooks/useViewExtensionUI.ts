import { useSearchStore } from "@/stores/searchStore";
import { useExtensionStore } from "@/stores/extensionStore";
import { isNil } from "lodash-es";

export const useVisibleSearchBar = () => {
  const visibleExtensionDetail = useSearchStore((state) => state.visibleExtensionDetail);
  const viewExtensions = useExtensionStore((state) => state.viewExtensions);
  
  const viewExtensionOpened = viewExtensions.length > 0 ? viewExtensions[viewExtensions.length - 1] : undefined;

  if (visibleExtensionDetail) return false;

  if (isNil(viewExtensionOpened)) return true;

  const ui = viewExtensionOpened[4];

  return ui?.search_bar ?? false;
};

export const useVisibleFilterBar = () => {
  const visibleExtensionStore = useSearchStore((state) => state.visibleExtensionStore);
  const visibleExtensionDetail = useSearchStore((state) => state.visibleExtensionDetail);
  const goAskAi = useSearchStore((state) => state.goAskAi);

  const viewExtensions = useExtensionStore((state) => state.viewExtensions);
  const viewExtensionOpened = viewExtensions.length > 0 ? viewExtensions[viewExtensions.length - 1] : undefined;

  if (visibleExtensionStore || visibleExtensionDetail || goAskAi) return false;

  if (isNil(viewExtensionOpened)) return true;

  const ui = viewExtensionOpened[4];

  return ui?.filter_bar ?? false;
};

export const useVisibleFooterBar = () => {
  const viewExtensions = useExtensionStore((state) => state.viewExtensions);
  const viewExtensionOpened = viewExtensions.length > 0 ? viewExtensions[viewExtensions.length - 1] : undefined;

  if (isNil(viewExtensionOpened)) return true;

  const ui = viewExtensionOpened[4];

  return ui?.footer ?? false;
};
