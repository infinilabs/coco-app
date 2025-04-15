import { modifierKeys } from "@/components/Settings/Advanced/components/Shortcuts";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useKeyPress } from "ahooks";

export const useModifierKeyPress = () => {
  const modifierKey = useShortcutsStore((state) => {
    return state.modifierKey;
  });
  const setModifierKeyPressed = useShortcutsStore((state) => {
    return state.setModifierKeyPressed;
  });

  useKeyPress(
    modifierKeys,
    (event, key) => {
      if (key === modifierKey) {
        setModifierKeyPressed(event.type === "keydown");
      }
    },
    {
      events: ["keydown", "keyup"],
    }
  );
};
