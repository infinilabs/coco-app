import { useOSKeyPress } from "@/hooks/useOSKeyPress";
import { useSearchStore } from "@/stores/searchStore";
import { useClickAway } from "ahooks";
import clsx from "clsx";
import { Link, PanelRight, Send, SquareArrowOutUpRight } from "lucide-react";
import { cloneElement, useRef } from "react";

const ContextMenu = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleContextMenu = useSearchStore((state) => {
    return state.visibleContextMenu;
  });

  const setVisibleContextMenu = useSearchStore((state) => {
    return state.setVisibleContextMenu;
  });

  const menus = [
    {
      name: "Open",
      icon: <SquareArrowOutUpRight />,
      keys: ["↩︎"],
    },
    {
      name: "Send to AI",
      icon: <Send />,
      keys: ["⌘", "↩︎"],
    },
    {
      name: "Copy link",
      icon: <Link />,
      keys: ["⌘", "L"],
    },
    {
      name: "Toggle details",
      icon: <PanelRight />,
      keys: ["⌘", "D"],
    },
  ];

  useOSKeyPress(["meta.k", "ctrl.k"], () => {
    setVisibleContextMenu(!visibleContextMenu);
  });

  useClickAway(() => {
    setVisibleContextMenu(false);
  }, containerRef);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "fixed bottom-[48px] right-[16px] min-w-[280px] scale-0 transition origin-bottom-right text-sm p-1 bg-white dark:bg-[#202126] rounded-lg shadow-xs border border-gray-200 dark:border-gray-700",
        {
          "!scale-100": visibleContextMenu,
        }
      )}
    >
      <ul className="flex flex-col">
        {menus.map((item) => {
          const { name, icon, keys } = item;

          return (
            <li
              key={name}
              className="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
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
  );
};

export default ContextMenu;
