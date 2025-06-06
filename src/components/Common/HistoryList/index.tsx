import { useKeyPress } from "ahooks";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Input,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { debounce, groupBy, isNil } from "lodash-es";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import clsx from "clsx";
import {
  Ellipsis,
  PanelLeftClose,
  Pencil,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import VisibleKey from "../VisibleKey";
import { Chat } from "@/types/chat";
import NoDataImage from "../NoDataImage";
import { closeHistoryPanel } from "@/utils";

dayjs.extend(isSameOrAfter);

interface HistoryListProps {
  id?: string;
  list: Chat[];
  active?: Chat;
  onSearch: (keyword: string) => void;
  onRefresh: () => void;
  onSelect: (chat: Chat) => void;
  onRename: (chatId: string, title: string) => void;
  onRemove: (chatId: string) => void;
}

const HistoryList: FC<HistoryListProps> = (props) => {
  const {
    id,
    list,
    active,
    onSearch,
    onRefresh,
    onSelect,
    onRename,
    onRemove,
  } = props;
  const { t } = useTranslation();
  const [isEdit, setIsEdit] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [isRefresh, setIsRefresh] = useState(false);

  const sortedList = useMemo(() => {
    if (isNil(list)) return {};

    const now = dayjs();

    return groupBy(list, (chat) => {
      const date = dayjs(chat._source?.created);

      if (date.isSame(now, "day")) {
        return "history_list.date.today";
      }

      if (date.isSame(now.subtract(1, "day"), "day")) {
        return "history_list.date.yesterday";
      }

      if (date.isSameOrAfter(now.subtract(7, "day"), "day")) {
        return "history_list.date.last7Days";
      }

      if (date.isSameOrAfter(now.subtract(30, "day"), "day")) {
        return "history_list.date.last30Days";
      }

      return date.format("YYYY-MM");
    });
  }, [list]);

  const menuItems = [
    // {
    //   label: "history_list.menu.share",
    //   icon: Share2,
    //   onClick: () => {},
    // },
    {
      label: "history_list.menu.rename",
      icon: Pencil,
      shortcut: "R",
      onClick: () => {
        setIsEdit(true);
      },
    },
    {
      label: "history_list.menu.delete",
      icon: Trash2,
      shortcut: "D",
      iconColor: "#FF2018",
      onClick: () => {
        setIsOpen(true);
      },
    },
  ];

  const debouncedSearch = useMemo(() => {
    return debounce((value: string) => onSearch(value), 300);
  }, [onSearch]);

  useKeyPress(["uparrow", "downarrow"], (_, key) => {
    const index = list.findIndex((item) => item._id === active?._id);
    const length = list.length;

    let nextIndex = index;

    switch (key) {
      case "uparrow":
        nextIndex = index === 0 ? length - 1 : index - 1;
        break;
      case "downarrow":
        nextIndex = index === length - 1 ? 0 : index + 1;
        break;
    }

    onSelect(list[nextIndex]);
  });

  useEffect(() => {
    if (!active?._id || !listRef.current) return;

    const activeEl = listRef.current.querySelector(`#${active._id}`);

    activeEl?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active?._id]);

  const handleRemove = () => {
    if (!active?._id) return;

    onRemove(active._id);

    setIsOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefresh(true);

    await onRefresh();

    setTimeout(() => {
      setIsRefresh(false);
    }, 1000);
  };

  return (
    <div
      ref={listRef}
      id={id}
      className={clsx(
        "flex flex-col h-screen text-sm bg-[#F3F4F6] dark:bg-[#1F2937]"
      )}
    >
      <div className="flex gap-1 p-2 border-b dark:border-[#343D4D]">
        <div className="flex-1 flex items-center gap-2 px-2 rounded-lg border transition border-[#E6E6E6] bg-[#F8F9FA] dark:bg-[#2B3444] dark:border-[#343D4D] focus-within:border-[#0061FF]">
          <VisibleKey
            shortcut="F"
            onKeyPress={() => {
              searchInputRef.current?.focus();
            }}
          >
            <Search className="size-4 text-[#6B7280]" />
          </VisibleKey>

          <Input
            autoFocus
            ref={searchInputRef}
            className="w-full bg-transparent outline-none"
            placeholder={t("history_list.search.placeholder")}
            onChange={(event) => {
              debouncedSearch(event.target.value);
            }}
          />
        </div>

        <div
          className="size-8 flex items-center justify-center rounded-lg border text-[#0072FF] border-[#E6E6E6] bg-[#F3F4F6] dark:border-[#343D4D] dark:bg-[#1F2937] hover:bg-[#F8F9FA] dark:hover:bg-[#353F4D] cursor-pointer transition"
          onClick={handleRefresh}
        >
          <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
            <RefreshCcw
              className={clsx("size-4", {
                "animate-spin": isRefresh,
              })}
            />
          </VisibleKey>
        </div>
      </div>

      <div className="flex-1 px-2 overflow-auto custom-scrollbar">
        {list.length > 0 ? (
          <>
            <div className="py-4">
              {Object.entries(sortedList).map(([label, list]) => {
                return (
                  <div key={label}>
                    <span className="text-xs text-[#999] px-3">{t(label)}</span>

                    <ul className="p-0">
                      {list.map((item) => {
                        const { _id, _source } = item;

                        const isActive = _id === active?._id;
                        const title = _source?.title ?? _id;

                        return (
                          <li
                            key={_id}
                            id={_id}
                            className={clsx(
                              "flex items-center mt-1 h-10 rounded-lg cursor-pointer hover:bg-[#EDEDED] dark:hover:bg-[#353F4D] transition",
                              {
                                "!bg-[#E5E7EB] dark:!bg-[#2B3444]": isActive,
                              }
                            )}
                            onClick={() => {
                              if (!isActive) {
                                setIsEdit(false);
                              }

                              onSelect(item);
                            }}
                          >
                            <div
                              className={clsx(
                                "w-1 h-6 rounded-sm bg-[#0072FF]",
                                {
                                  "opacity-0": _id !== active?._id,
                                }
                              )}
                            />

                            <div className="flex-1 flex items-center justify-between gap-2 px-2 overflow-hidden">
                              {isEdit && isActive ? (
                                <Input
                                  autoFocus
                                  defaultValue={title}
                                  className="flex-1 -mx-px outline-none bg-transparent border border-[#0061FF] rounded-[4px]"
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter") return;

                                    onRename(
                                      item._id,
                                      event.currentTarget.value
                                    );

                                    setIsEdit(false);
                                  }}
                                  onBlur={(event) => {
                                    onRename(item._id, event.target.value);

                                    setIsEdit(false);
                                  }}
                                />
                              ) : (
                                <span className="truncate">{title}</span>
                              )}

                              <div className="flex items-center gap-2">
                                {isActive && !isEdit && (
                                  <VisibleKey
                                    shortcut="↑↓"
                                    rootClassName="w-6"
                                    shortcutClassName="w-6"
                                  />
                                )}

                                <Popover>
                                  {isActive && !isEdit && (
                                    <PopoverButton
                                      ref={moreButtonRef}
                                      className="flex gap-2"
                                    >
                                      <VisibleKey
                                        shortcut="O"
                                        onKeyPress={() => {
                                          moreButtonRef.current?.click();
                                        }}
                                      >
                                        <Ellipsis className="size-4 text-[#979797]" />
                                      </VisibleKey>
                                    </PopoverButton>
                                  )}

                                  <PopoverPanel
                                    anchor="bottom"
                                    className="flex flex-col rounded-lg shadow-md z-100 bg-white dark:bg-[#202126] p-1 border border-black/2 dark:border-white/10"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                    }}
                                  >
                                    {menuItems.map((menuItem) => {
                                      const {
                                        label,
                                        icon: Icon,
                                        shortcut,
                                        iconColor,
                                        onClick,
                                      } = menuItem;

                                      return (
                                        <button
                                          key={label}
                                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[#EDEDED] dark:hover:bg-[#2B2C31] transition"
                                          onClick={onClick}
                                        >
                                          <VisibleKey
                                            shortcut={shortcut}
                                            onKeyPress={onClick}
                                          >
                                            <Icon
                                              className="size-4"
                                              style={{
                                                color: iconColor,
                                              }}
                                            />
                                          </VisibleKey>

                                          <span>{t(label)}</span>
                                        </button>
                                      );
                                    })}
                                  </PopoverPanel>
                                </Popover>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <Dialog
              open={isOpen}
              onClose={() => setIsOpen(false)}
              className="relative z-1000"
            >
              <div
                id="headlessui-popover-panel:delete-history"
                className="fixed inset-0 flex items-center justify-center w-screen"
              >
                <DialogPanel className="flex flex-col justify-between w-[360px] h-[160px] p-3 text-[#333] dark:text-white/90 border border-[#e6e6e6] bg-white dark:bg-[#202126] dark:border-white/10 shadow-xl rounded-lg">
                  <div className="flex flex-col gap-3">
                    <DialogTitle className="text-base font-bold">
                      {t("history_list.delete_modal.title")}
                    </DialogTitle>
                    <Description className="text-sm">
                      {t("history_list.delete_modal.description", {
                        replace: [
                          active?._source?.title ||
                            active?._source?.message ||
                            active?._id,
                        ],
                      })}
                    </Description>
                  </div>

                  <div className="flex gap-4 self-end">
                    <VisibleKey
                      shortcut="N"
                      shortcutClassName="left-[unset] right-0"
                      onKeyPress={() => setIsOpen(false)}
                    >
                      <button
                        className="h-8 px-4 text-sm text-[#666666] bg-[#F8F9FA] dark:text-white dark:bg-[#202126] border border-[#E6E6E6] dark:border-white/10 rounded-lg"
                        onClick={() => setIsOpen(false)}
                      >
                        {t("history_list.delete_modal.button.cancel")}
                      </button>
                    </VisibleKey>

                    <VisibleKey
                      shortcut="Y"
                      shortcutClassName="left-[unset] right-0"
                      onKeyPress={handleRemove}
                    >
                      <button
                        className="h-8 px-4 text-sm text-white bg-[#EF4444] rounded-lg"
                        onClick={handleRemove}
                      >
                        {t("history_list.delete_modal.button.delete")}
                      </button>
                    </VisibleKey>
                  </div>
                </DialogPanel>
              </div>
            </Dialog>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 pt-8">
            <NoDataImage />
          </div>
        )}
      </div>

      {id && (
        <div className="flex justify-end p-2 border-t dark:border-[#343D4D]">
          <VisibleKey shortcut="Esc" shortcutClassName="w-7">
            <PanelLeftClose
              className="size-4 text-black/80 dark:text-white/80 cursor-pointer"
              onClick={closeHistoryPanel}
            />
          </VisibleKey>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
