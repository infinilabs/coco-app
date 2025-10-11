import { useAppStore } from "@/stores/appStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import clsx from "clsx";
import VisibleKey from "./VisibleKey";
import { FC, HTMLAttributes } from "react";
import PinOffIcon from "@/icons/PinOff";
import PinIcon from "@/icons/Pin";
import { noop } from "lodash-es";

interface TogglePinProps extends HTMLAttributes<HTMLButtonElement> {
  setIsPinnedWeb?: (value: boolean) => void;
  triggerKeyPress?: boolean;
}

const TogglePin: FC<TogglePinProps> = (props) => {
  const { className, setIsPinnedWeb, triggerKeyPress = false } = props;
  const { isPinned, setIsPinned } = useAppStore();
  const { fixedWindow } = useShortcutsStore();

  const togglePin = async () => {
    const { isTauri, isPinned } = useAppStore.getState();

    try {
      const nextPinned = !isPinned;

      if (!isTauri) {
        setIsPinnedWeb?.(nextPinned);
      }

      setIsPinned(nextPinned);
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
      setIsPinned(isPinned);
    }
  };

  return (
    <button
      onClick={togglePin}
      className={clsx(className, {
        "text-blue-500": isPinned,
      })}
    >
      <VisibleKey
        shortcut={fixedWindow}
        onKeyPress={triggerKeyPress ? togglePin : noop}
      >
        {isPinned ? <PinIcon /> : <PinOffIcon />}
      </VisibleKey>
    </button>
  );
};

export default TogglePin;
