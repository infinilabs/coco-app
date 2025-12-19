import platformAdapter from "@/utils/platformAdapter";
import { useSearchStore } from "@/stores/searchStore";
import { useKeyPress } from "ahooks";
import { HISTORY_PANEL_ID } from "@/constants";
import { closeHistoryPanel } from "@/utils";

const useEscape = () => {
  const visibleContextMenu = useSearchStore((state) => {
    return state.visibleContextMenu;
  });
  const setVisibleContextMenu = useSearchStore((state) => {
    return state.setVisibleContextMenu;
  });
  const viewExtensionOpened = useSearchStore((state) => {
    return state.viewExtensionOpened;
  });

  useKeyPress("esc", (event) => {
    event.preventDefault();
    event.stopPropagation();

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
