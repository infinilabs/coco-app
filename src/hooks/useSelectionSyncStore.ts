import { useEffect } from "react";
import { isEqual } from "lodash-es";

import { useSelectionStore } from "@/stores/selectionStore";
import platformAdapter from "@/utils/platformAdapter";

export const useSelectionSyncStore = () => {
  const setToolbarConfig = useSelectionStore((s) => s.setToolbarConfig);
  const setIconsOnly = useSelectionStore((s) => s.setIconsOnly);

  useEffect(() => {
    const unListeners = Promise.all([
      platformAdapter.listenEvent(
        "change-selection-store",
        ({ payload }: any) => {
          const { iconsOnly, toolbarConfig } = payload;

          // Prevent infinite loop: only update if value changed
          if (useSelectionStore.getState().iconsOnly !== iconsOnly) {
            setIconsOnly(iconsOnly);
          }

          if (
            !isEqual(useSelectionStore.getState().toolbarConfig, toolbarConfig)
          ) {
            setToolbarConfig(toolbarConfig);
          }
        }
      ),
    ]);

    return () => {
      unListeners.then((fns) => {
        fns.forEach((fn) => fn());
      });
    };
  }, []);
};
