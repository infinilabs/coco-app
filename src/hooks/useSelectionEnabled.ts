import { useMount } from "ahooks";

import platformAdapter from "@/utils/platformAdapter";
import { useSelectionStore } from "@/stores/selectionStore";

export default function useSelectionEnabled() {
  useMount(async () => {
    try {
      const enabled = await platformAdapter.invokeBackend<boolean>("get_selection_enabled");
      useSelectionStore.getState().setSelectionEnabled(!!enabled);
    } catch (e) {
      console.error("get_selection_enabled failed:", e);
    }

    const unlisten = await platformAdapter.listenEvent(
      "selection-enabled",
      ({ payload }: any) => {
        useSelectionStore.getState().setSelectionEnabled(!!payload?.enabled);
      }
    );

    return () => {
      unlisten && unlisten();
    };
  });
}