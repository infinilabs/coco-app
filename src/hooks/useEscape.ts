import { useKeyPress } from "ahooks";

import platformAdapter from "@/utils/platformAdapter";
import { useSearchStore } from "@/stores/searchStore";
import { useExtensionStore } from "@/stores/extensionStore";
import { HISTORY_PANEL_ID } from "@/constants";
import { closeHistoryPanel } from "@/utils";

const useEscape = () => {
  const { setVisibleContextMenu } = useSearchStore();
  const viewExtensionOpened = useExtensionStore((state) =>
    state.viewExtensions.length > 0 ? state.viewExtensions[state.viewExtensions.length - 1] : undefined
  );

  useKeyPress("esc", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const { visibleContextMenu } =
      useSearchStore.getState();

    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return document.activeElement.blur();
    }

    if (visibleContextMenu) {
      return setVisibleContextMenu(false);
    }

    const historyPanel = document.getElementById(HISTORY_PANEL_ID);

    if (historyPanel) {
      return closeHistoryPanel();
    }

    if (viewExtensionOpened != null) {
      return;
    }

    platformAdapter.hideWindow();
  });
};

export default useEscape;
