import {
  useClickAway,
  useCreation,
  useEventListener,
  useReactive,
} from "ahooks";
import clsx from "clsx";
import { isNil, noop } from "lodash-es";
import { Copy, Link, SquareArrowOutUpRight } from "lucide-react";
import { cloneElement, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useOSKeyPress } from "@/hooks/useOSKeyPress";
import { useSearchStore } from "@/stores/searchStore";
import { copyToClipboard, OpenURLWithBrowser } from "@/utils";
import { isMac } from "@/utils/platform";
import { CONTEXT_MENU_PANEL_ID } from "@/constants";

interface State {
  activeMenuIndex: number;
}

interface ContextMenuProps {
  hideCoco?: () => void;
}

const ContextMenu = ({ hideCoco }: ContextMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { t, i18n } = useTranslation();

  const visibleContextMenu = useSearchStore((state) => {
    return state.visibleContextMenu;
  });

  const setVisibleContextMenu = useSearchStore((state) => {
    return state.setVisibleContextMenu;
  });

  const selectedSearchContent = useSearchStore((state) => {
    return state.selectedSearchContent;
  });

  const menus = useCreation(() => {
    if (isNil(selectedSearchContent)) return [];

    const { url, category, payload } = selectedSearchContent;
    const { query, result } = payload ?? {};

    const menus = [
      {
        name: "search.contextMenu.open",
        icon: <SquareArrowOutUpRight />,
        keys: isMac ? ["↩︎"] : ["Enter"],
        shortcut: "enter",
        hide: category === "Calculator",
        clickEvent: () => {
          OpenURLWithBrowser(url);

          hideCoco && hideCoco();
        },
      },
      {
        name: "search.contextMenu.copyLink",
        icon: <Link />,
        keys: isMac ? ["⌘", "L"] : ["Ctrl", "L"],
        shortcut: isMac ? "meta.l" : "ctrl.l",
        hide: category === "Calculator",
        clickEvent() {
          copyToClipboard(url);
        },
      },
      {
        name: "search.contextMenu.copyAnswer",
        icon: <Copy />,
        keys: isMac ? ["↩︎"] : ["Enter"],
        shortcut: "enter",
        hide: category !== "Calculator",
        clickEvent() {
          copyToClipboard(result.value);
        },
      },
      {
        name: "search.contextMenu.copyUppercaseAnswer",
        icon: <Copy />,
        keys: isMac ? ["⌘", "↩︎"] : ["Ctrl", "Enter"],
        shortcut: "meta.enter",
        hide: category !== "Calculator",
        clickEvent() {
          copyToClipboard(i18n.language === "zh" ? result.toZh : result.toEn);
        },
      },
      {
        name: "search.contextMenu.copyQuestionAndAnswer",
        icon: <Copy />,
        keys: isMac ? ["⌘", "L"] : ["Ctrl", "L"],
        shortcut: "meta.l",
        hide: category !== "Calculator",
        clickEvent() {
          copyToClipboard(`${query.value} = ${result.value}`);
        },
      },
    ];

    return menus.filter((item) => !item.hide);
  }, [selectedSearchContent]);

  const shortcuts = useCreation(() => {
    return menus.map((item) => item.shortcut);
  }, [menus]);

  const state = useReactive<State>({
    activeMenuIndex: 0,
  });

  useEffect(() => {
    state.activeMenuIndex = 0;
  }, [visibleContextMenu, selectedSearchContent]);

  useEffect(() => {
    if (isNil(selectedSearchContent)) {
      setVisibleContextMenu(false);
    }
  }, [selectedSearchContent]);

  useOSKeyPress(["meta.k", "ctrl.k"], () => {
    if (isNil(selectedSearchContent)) return;

    setVisibleContextMenu(!visibleContextMenu);
  });

  useClickAway(() => {
    setVisibleContextMenu(false);
  }, containerRef);

  useOSKeyPress(["uparrow", "downarrow"], (_, key) => {
    if (!visibleContextMenu) return;

    const index = state.activeMenuIndex;
    const length = menus.length;

    switch (key) {
      case "uparrow":
        state.activeMenuIndex = index === 0 ? length - 1 : index - 1;
        break;
      case "downarrow":
        state.activeMenuIndex = index === length - 1 ? 0 : index + 1;
        break;
    }
  });

  useOSKeyPress(shortcuts, (_, key) => {
    if (!visibleContextMenu) return;

    const item = menus.find((item) => item.shortcut === key);

    handleClick(item?.clickEvent);
  });

  useEventListener("keydown", (event) => {
    if (!visibleContextMenu) return;

    event.stopImmediatePropagation();
  });

  const handleClick = (click = noop) => {
    click?.();

    setVisibleContextMenu(false);
  };

  return (
    <>
      {visibleContextMenu && (
        <div
          className="fixed inset-0"
          onContextMenu={(event) => {
            event?.preventDefault();

            setVisibleContextMenu(false);
          }}
        />
      )}

      <div
        ref={containerRef}
        id={visibleContextMenu ? CONTEXT_MENU_PANEL_ID : ""}
        className={clsx(
          "absolute bottom-[40px] right-[8px] min-w-[280px] scale-0 transition origin-bottom-right text-sm p-1 bg-white dark:bg-[#202126] rounded-lg shadow-xs border border-gray-200 dark:border-gray-700",
          {
            "!scale-100": visibleContextMenu,
          }
        )}
      >
        <ul className="flex flex-col">
          {menus.map((item, index) => {
            const { name, icon, keys, clickEvent } = item;

            return (
              <li
                key={name}
                className={clsx(
                  "flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer",
                  {
                    "bg-black/5 dark:bg-white/5":
                      index === state.activeMenuIndex,
                  }
                )}
                onMouseEnter={() => {
                  state.activeMenuIndex = index;
                }}
                onClick={() => handleClick(clickEvent)}
              >
                <div className="flex items-center gap-2 text-black/80 dark:text-white/80">
                  {cloneElement(icon, { className: "size-4" })}

                  <span>{t(name)}</span>
                </div>

                <div className="flex gap-[4px] text-black/60 dark:text-white/60">
                  {keys.map((key) => (
                    <kbd
                      key={key}
                      className={clsx(
                        "flex justify-center items-center font-sans h-[20px] min-w-[20px] text-[10px] rounded-md border border-black/10 dark:border-white/10",
                        {
                          "px-1": key.length > 1,
                        }
                      )}
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
};

export default ContextMenu;
