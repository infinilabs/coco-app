import { useClickAway, useCreation, useReactive } from "ahooks";
import clsx from "clsx";
import { isNil, lowerCase, noop } from "lodash-es";
import {
  Copy,
  Download,
  Info,
  Link,
  Settings,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import { cloneElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@headlessui/react";

import { useOSKeyPress } from "@/hooks/useOSKeyPress";
import { useSearchStore } from "@/stores/searchStore";
import { copyToClipboard } from "@/utils";
import { isMac } from "@/utils/platform";
import { CONTEXT_MENU_PANEL_ID } from "@/constants";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import VisibleKey from "../Common/VisibleKey";
import platformAdapter from "@/utils/platformAdapter";
import SearchEmpty from "../Common/SearchEmpty";

interface State {
  activeMenuIndex: number;
}

interface ContextMenuProps {
  formatUrl?: (item: any) => string;
}

const ContextMenu = ({ formatUrl }: ContextMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const state = useReactive<State>({
    activeMenuIndex: 0,
  });
  const { setOpenPopover } = useShortcutsStore();
  const [searchMenus, setSearchMenus] = useState<typeof menus>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    visibleContextMenu,
    setVisibleContextMenu,
    selectedSearchContent,
    selectedExtension,
    setVisibleExtensionDetail,
  } = useSearchStore();

  const title = useCreation(() => {
    if (selectedExtension) {
      return selectedExtension.name;
    }

    if (selectedSearchContent?.id === "Calculator") {
      return t("search.contextMenu.title.calculator");
    }

    return selectedSearchContent?.title;
  }, [selectedSearchContent, selectedExtension]);

  const menus = useCreation(() => {
    if (selectedExtension) {
      return [
        {
          name: t("search.contextMenu.details"),
          icon: <Info />,
          keys: isMac ? ["↩︎"] : ["Enter"],
          shortcut: "enter",
          clickEvent() {
            setVisibleExtensionDetail(true);
          },
        },
        {
          name: t("search.contextMenu.install"),
          icon: <Download />,
          keys: isMac ? ["⌘", "↩︎"] : ["Ctrl", "Enter"],
          shortcut: isMac ? "meta.enter" : "ctrl.enter",
          hide: selectedExtension.installed,
          clickEvent() {
            platformAdapter.emitEvent("install-extension");
          },
        },
        {
          name: t("search.contextMenu.configureExtension"),
          icon: <Settings />,
          keys: isMac ? ["⌘", "/"] : ["Ctrl", "/"],
          shortcut: isMac ? "meta.forwardslash" : "ctrl.forwardslash",
          hide: !selectedExtension.installed,
          clickEvent() {
            platformAdapter.emitEvent("config-extension", selectedExtension.id);
          },
        },
        {
          name: t("search.contextMenu.uninstall"),
          icon: <Trash2 />,
          keys: isMac ? ["⌘", "X"] : ["Ctrl", "X"],
          shortcut: isMac ? "meta.x" : "ctrl.x",
          hide: !selectedExtension.installed,
          color: "#fa4545",
          clickEvent() {
            platformAdapter.emitEvent("uninstall-extension");
          },
        },
      ];
    }

    if (isNil(selectedSearchContent)) {
      return [];
    }

    const { id, url, category, type, payload, source } = selectedSearchContent;
    const { query, result } = payload ?? {};

    if (category === "AI Overview") {
      return [];
    }

    return [
      {
        name: t("search.contextMenu.open"),
        icon: <SquareArrowOutUpRight />,
        keys: isMac ? ["↩︎"] : ["Enter"],
        shortcut: "enter",
        hide: category === "Calculator",
        clickEvent: () => {
          platformAdapter.openSearchItem(
            selectedSearchContent as any,
            formatUrl
          );
        },
      },
      {
        name: t("search.contextMenu.copyLink"),
        icon: <Link />,
        keys: isMac ? ["⌘", "L"] : ["Ctrl", "L"],
        shortcut: isMac ? "meta.l" : "ctrl.l",
        hide:
          category === "Calculator" ||
          type === "AI Assistant" ||
          id === "Extension Store",
        clickEvent() {
          copyToClipboard(
            (formatUrl && formatUrl(selectedSearchContent)) || url
          );
        },
      },
      {
        name: t("search.contextMenu.copyAnswer"),
        icon: <Copy />,
        keys: isMac ? ["↩︎"] : ["Enter"],
        shortcut: "enter",
        hide: category !== "Calculator",
        clickEvent() {
          copyToClipboard(result.value);
        },
      },
      {
        name: t("search.contextMenu.copyUppercaseAnswer"),
        icon: <Copy />,
        keys: isMac ? ["⌘", "↩︎"] : ["Ctrl", "Enter"],
        shortcut: isMac ? "meta.enter" : "ctrl.enter",
        hide: category !== "Calculator",
        clickEvent() {
          copyToClipboard(i18n.language === "zh" ? result.toZh : result.toEn);
        },
      },
      {
        name: t("search.contextMenu.copyQuestionAndAnswer"),
        icon: <Copy />,
        keys: isMac ? ["⌘", "L"] : ["Ctrl", "L"],
        shortcut: isMac ? "meta.l" : "ctrl.l",
        hide: category !== "Calculator",
        clickEvent() {
          copyToClipboard(`${query.value} = ${result.value}`);
        },
      },
      {
        name: t("search.contextMenu.openFileLocation"),
        icon: <SquareArrowOutUpRight />,
        keys: isMac ? ["⌘", "↩︎"] : ["Ctrl", "Enter"],
        shortcut: isMac ? "meta.enter" : "ctrl.enter",
        hide: source?.id !== "File Search",
        clickEvent: async () => {
          await platformAdapter.revealItemInDir(url);

          platformAdapter.hideWindow();
        },
      },
    ];
  }, [selectedSearchContent, selectedExtension]);

  useEffect(() => {
    const filterMenus = menus.filter((item) => !item?.hide);

    setSearchMenus(filterMenus);
  }, [menus]);

  const shortcuts = useCreation(() => {
    return searchMenus.map((item) => item.shortcut);
  }, [searchMenus]);

  useEffect(() => {
    state.activeMenuIndex = 0;
  }, [visibleContextMenu, selectedSearchContent]);

  useEffect(() => {
    if (isNil(selectedSearchContent)) {
      setVisibleContextMenu(false);
    }
  }, [selectedSearchContent]);

  useOSKeyPress(["meta.k", "ctrl.k"], () => {
    if (isNil(selectedSearchContent) && isNil(selectedExtension)) return;

    setVisibleContextMenu(!visibleContextMenu);
  });

  useClickAway(() => {
    setVisibleContextMenu(false);
  }, containerRef);

  useOSKeyPress(["uparrow", "downarrow"], (_, key) => {
    if (!visibleContextMenu) return;

    const index = state.activeMenuIndex;
    const length = searchMenus.length;

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
    shortcuts,
    (event, key) => {
      if (!visibleContextMenu) return;

      event.stopPropagation();

      let matched;

      if (key === "enter") {
        matched = searchMenus.find((_, index) => {
          return index === state.activeMenuIndex;
        });
      } else {
        matched = searchMenus.find((item) => item.shortcut === key);
      }

      handleClick(matched?.clickEvent);
    },
    {
      target: document.body,
    }
  );

  useEffect(() => {
    setOpenPopover(visibleContextMenu);
  }, [visibleContextMenu]);

  const handleClick = (click = noop) => {
    click?.();

    requestAnimationFrame(() => {
      setVisibleContextMenu(false);
    });
  };

  return (
    menus.length > 0 && (
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
            "absolute bottom-[50px] right-[18px] w-[300px] flex flex-col gap-2 scale-0 transition origin-bottom-right text-sm p-3 pb-0 bg-white dark:bg-black rounded-lg shadow-xs border border-[#EDEDED] dark:border-[#272828] shadow-lg dark:shadow-white/15",
            {
              "!scale-100": visibleContextMenu,
            }
          )}
        >
          <div className="text-[#999] dark:text-[#666] truncate">{title}</div>

          {searchMenus.length > 0 ? (
            <ul className="flex flex-col -mx-2 p-0">
              {searchMenus.map((item, index) => {
                const { name, icon, keys, color, clickEvent } = item;

                return (
                  <li
                    key={name}
                    className={clsx(
                      "flex justify-between items-center gap-2 px-2 py-2 rounded-lg cursor-pointer",
                      {
                        "bg-[#EDEDED] dark:bg-[#202126]":
                          index === state.activeMenuIndex,
                      }
                    )}
                    onMouseEnter={() => {
                      state.activeMenuIndex = index;
                    }}
                    onClick={() => handleClick(clickEvent)}
                  >
                    <div className="flex items-center gap-2 text-black/80 dark:text-white/80">
                      {cloneElement(icon, {
                        className: "size-4",
                        style: { color },
                      })}

                      <span style={{ color }}>{name}</span>
                    </div>

                    <div className="flex gap-[4px] text-black/60 dark:text-white/60">
                      {keys.map((key) => (
                        <kbd
                          key={key}
                          className={clsx(
                            "flex justify-center items-center font-sans h-[20px] min-w-[20px] text-[10px] rounded-[6px] border border-[#EDEDED] dark:border-white/10 bg-white dark:bg-[#202126]",
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
          ) : (
            <div className="py-4">
              <SearchEmpty width={80} />
            </div>
          )}

          <div className="-mx-3 p-2 border-t border-[#E6E6E6] dark:border-[#262626]">
            {visibleContextMenu && (
              <VisibleKey
                shortcut="F"
                shortcutClassName="left-3"
                onKeyPress={() => {
                  searchInputRef.current?.focus();
                }}
              >
                <Input
                  ref={searchInputRef}
                  autoFocus
                  autoCorrect="off"
                  placeholder={t("search.contextMenu.search")}
                  className="w-full bg-transparent"
                  onChange={(event) => {
                    const value = event.target.value.trim();

                    const nextMenus = menus
                      .filter((item) => !item.hide)
                      .filter((item) => {
                        return lowerCase(item.name).includes(lowerCase(value));
                      });

                    setSearchMenus(nextMenus);
                  }}
                />
              </VisibleKey>
            )}
          </div>
        </div>
      </>
    )
  );
};

export default ContextMenu;
