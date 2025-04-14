import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useKeyPress } from "ahooks";
import { FC, ReactNode } from "react";

interface VisibleKeyProps {
  shortcut: string;
  children: ReactNode;
  onKeypress?: () => void;
}

const VisibleKey: FC<VisibleKeyProps> = (props) => {
  const { shortcut, children, onKeypress } = props;

  const modifierKey = useShortcutsStore((state) => {
    return state.modifierKey;
  });
  const modifierKeyPressed = useShortcutsStore((state) => {
    return state.modifierKeyPressed;
  });

  useKeyPress(`${modifierKey}.${shortcut}`, () => {
    onKeypress?.();
  });

  return modifierKeyPressed ? (
    <div className="size-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]">
      {shortcut}
    </div>
  ) : (
    children
  );
};

export default VisibleKey;
