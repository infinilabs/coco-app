import { FC, HTMLAttributes, useEffect, useRef, useState } from "react";
import { useKeyPress } from "ahooks";
import clsx from "clsx";
import { last } from "lodash-es";

import { POPOVER_PANEL_SELECTOR } from "@/constants";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useAppStore } from "@/stores/appStore";

interface VisibleKeyProps extends HTMLAttributes<HTMLDivElement> {
  shortcut: string;
  rootClassName?: string;
  shortcutClassName?: string;
  onKeyPress?: () => void;
}

const VisibleKey: FC<VisibleKeyProps> = (props) => {
  const {
    shortcut,
    rootClassName,
    shortcutClassName,
    children,
    onKeyPress,
    ...rest
  } = props;

  const showTooltip = useAppStore((state) => state.showTooltip);

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
    const popoverPanelEls = document.querySelectorAll(POPOVER_PANEL_SELECTOR);

    const popoverPanelEl = last(popoverPanelEls);

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

  useKeyPress(`${modifierKey}.${shortcut}`, (event) => {
    if (!visibleShortcut) return;

    event.stopPropagation();
    event.preventDefault();

    onKeyPress?.();
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

  return (
    <div
      {...rest}
      ref={childrenRef}
      className={clsx(rootClassName, "relative inline-block")}
    >
      {children}

      {showTooltip && visibleShortcut ? (
        <div
          className={clsx(
            "size-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            shortcutClassName
          )}
        >
          {renderShortcut()}
        </div>
      ) : null}
    </div>
  );
};

export default VisibleKey;
