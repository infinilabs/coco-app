import { POPOVER_PANEL_SELECTOR } from "@/constants";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useKeyPress } from "ahooks";
import clsx from "clsx";
import { FC, ReactNode, useEffect, useRef, useState } from "react";

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
  const openPopover = useShortcutsStore((state) => {
    return state.openPopover;
  });

  const childrenRef = useRef<HTMLDivElement>(null);
  const [visibleShortcut, setVisibleShortcut] = useState<boolean>();

  useEffect(() => {
    const popoverPanelEl = document.querySelector(POPOVER_PANEL_SELECTOR);

    if (!openPopover || !popoverPanelEl) {
      return setVisibleShortcut(modifierKeyPressed);
    }

    const popoverButtonEl = document.querySelector(
      `[aria-controls="${popoverPanelEl.id}"]`
    );

    const isChildInPanel = popoverPanelEl?.contains(childrenRef.current);
    const isChildInButton = popoverButtonEl?.contains(childrenRef.current);

    const isChildInPopover = isChildInPanel || isChildInButton;

    setVisibleShortcut(isChildInPopover && modifierKeyPressed);
  }, [openPopover, modifierKeyPressed]);

  useKeyPress(`${modifierKey}.${shortcut}`, () => {
    if (!visibleShortcut) return;

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

  return visibleShortcut ? (
    <div
      className={clsx(
        "size-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]",
        className
      )}
    >
      {renderShortcut()}
    </div>
  ) : (
    <div ref={childrenRef}>{children}</div>
  );
};

export default VisibleKey;
