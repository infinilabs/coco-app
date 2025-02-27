import { useOSKeyPress } from "@/hooks/useOSKeyPress";
import { useSearchStore } from "@/stores/searchStore";
import { copyToClipboard, OpenURLWithBrowser } from "@/utils";
import { isMac } from "@/utils/platform";
import {
  useClickAway,
  useCreation,
  useEventListener,
  useReactive,
} from "ahooks";
import clsx from "clsx";
import { isNil } from "lodash-es";
import { Link, PanelRight, Send, SquareArrowOutUpRight } from "lucide-react";
import { cloneElement, useEffect, useRef } from "react";

interface State {
  activeMenuIndex: number;
}

const ContextMenu = () => {
  const containerRef = useRef<HTMLDivElement>(null);

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

    return [
      {
        name: "Open",
        icon: <SquareArrowOutUpRight />,
        keys: ["↩︎"],
        shortcut: "enter",
        clickEvent: () => {
          OpenURLWithBrowser(selectedSearchContent?.url);
        },
      },
      {
        name: "Send to AI",
        icon: <Send />,
        keys: ["⌘", "↩︎"],
        shortcut: isMac ? "meta.enter" : "ctrl.enter",
        clickEvent: () => {},
      },
      {
        name: "Copy link",
        icon: <Link />,
        keys: ["⌘", "L"],
        shortcut: isMac ? "meta.l" : "ctrl.l",
        clickEvent: () => {
          copyToClipboard(selectedSearchContent?.url);
        },
      },
      {
        name: "Toggle details",
        icon: <PanelRight />,
        keys: ["⌘", "D"],
        shortcut: isMac ? "meta.d" : "ctrl.d",
        clickEvent: () => {},
      },
    ];
  }, [selectedSearchContent]);

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

  useOSKeyPress(
    menus.map((item) => item.shortcut),
    (_, key) => {
      if (!visibleContextMenu) return;

      const item = menus.find((item) => item.shortcut === key);

      handleClick(item?.clickEvent);
    }
  );

  useEventListener("keydown", (event) => {
    if (!visibleContextMenu) return;

    event.stopImmediatePropagation();
  });

  const handleClick = (clickEvent?: () => void) => {
    clickEvent?.();

    setVisibleContextMenu(false);
  };

  return (
    <>
      {visibleContextMenu && <div className="fixed inset-0"></div>}

      <div
        ref={containerRef}
        className={clsx(
          "fixed bottom-[40px] right-[8px] min-w-[280px] scale-0 transition origin-bottom-right text-sm p-1 bg-white dark:bg-[#202126] rounded-lg shadow-xs border border-gray-200 dark:border-gray-700",
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

                  <span>{name}</span>
                </div>

                <div className="flex gap-[4px] text-black/60 dark:text-white/60">
                  {keys.map((key) => (
                    <kbd
                      key={key}
                      className="flex justify-center items-center font-sans h-[20px] min-w-[20px] text-[10px] rounded-md border border-black/10 dark:border-white/10"
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
