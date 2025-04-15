import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useKeyPress } from "ahooks";
import clsx from "clsx";
import { FC, ReactNode } from "react";

interface VisibleKeyProps {
  shortcut: string;
  children?: ReactNode;
  className?: string;
  onKeypress?: () => void;
}

const VisibleKey: FC<VisibleKeyProps> = (props) => {
  const { shortcut, children, className, onKeypress } = props;

  const modifierKey = useShortcutsStore((state) => {
    return state.modifierKey;
  });
  const modifierKeyPressed = useShortcutsStore((state) => {
    return state.modifierKeyPressed;
  });

  useKeyPress(`${modifierKey}.${shortcut}`, () => {
    onKeypress?.();
  });

  const renderShortcut = () => {
    if (shortcut === "leftarrow") {
      return "←";
    }

    if (shortcut === "rightarrow") {
      return "→";
    }

    return shortcut;
  };

  return modifierKeyPressed ? (
    <div
      className={clsx(
        "size-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]",
        className
      )}
    >
      {renderShortcut()}
    </div>
  ) : (
    children
  );
};

export default VisibleKey;
