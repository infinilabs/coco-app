import { POPOVER_PANEL_SELECTOR } from "@/constants";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useKeyPress } from "ahooks";

export const useModifierKeyPress = () => {
  const modifierKey = useShortcutsStore((state) => {
    return state.modifierKey;
  });
  const setModifierKeyPressed = useShortcutsStore((state) => {
    return state.setModifierKeyPressed;
  });
  const setOpenPopover = useShortcutsStore((state) => {
    return state.setOpenPopover;
  });

  useKeyPress(
    modifierKey,
    (event) => {
      const popoverPanelEl = document.querySelector(POPOVER_PANEL_SELECTOR);
      setOpenPopover(Boolean(popoverPanelEl));

      setModifierKeyPressed(event.type === "keydown");
    },
    {
      events: ["keydown", "keyup"],
    }
  );
};
