import { Chat } from "@/components/Assistant/types";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { debounce, groupBy, isNil } from "lodash-es";
import { FC, useMemo, useState } from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import clsx from "clsx";
import { Ellipsis, Pencil, RefreshCcw, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

dayjs.extend(isSameOrAfter);

interface HistoryListProps {
  list: Chat[];
  active?: Chat;
  onSearch: (keyword: string) => void;
  onRefresh: () => void;
  onSelect: (chat: Chat) => void;
  onRename: (chat: Chat, title: string) => void;
  onRemove: (chatId: string) => void;
}

const HistoryList: FC<HistoryListProps> = (props) => {
  const { list, active, onSearch, onRefresh, onSelect, onRename, onRemove } =
    props;
  const { t } = useTranslation();
  const [isEdit, setIsEdit] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const sortedList = useMemo(() => {
    if (isNil(list)) return {};

    const now = dayjs();

    return groupBy(list, (chat) => {
      const date = dayjs(chat._source?.updated);

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
      onClick: () => {
        setIsEdit(true);
      },
    },
    {
      label: "history_list.menu.delete",
      icon: Trash2,
      iconColor: "#FF2018",
      onClick: () => {
        setIsOpen(true);
      },
    },
  ];

  const debouncedSearch = useMemo(() => {
    return debounce((value: string) => onSearch(value), 500);
  }, [onSearch]);

  return (
    <div
      className={clsx(
        "h-full overflow-auto px-3 py-2 text-sm bg-[#F3F4F6] dark:bg-[#1F2937]"
      )}
    >
      <div className="flex gap-1 children:h-8">
        <div className="flex-1 flex items-center gap-2 px-2 rounded-lg border transition border-[#E6E6E6] bg-[#F8F9FA] dark:bg-[#2B3444] dark:border-[#343D4D] focus-within:border-[#0061FF]">
          <Search className="size-4 text-[#6B7280]" />

          <Input
            className="w-full bg-transparent outline-none"
            placeholder={t("history_list.search.placeholder")}
            onChange={(event) => {
              debouncedSearch(event.target.value);
            }}
          />
        </div>

        <div
          className="size-8 flex items-center justify-center rounded-lg border text-[#0072FF] border-[#E6E6E6] bg-[#F3F4F6] dark:border-[#343D4D] dark:bg-[#1F2937] hover:bg-[#F8F9FA] dark:hover:bg-[#353F4D] cursor-pointer transition"
          onClick={onRefresh}
        >
          <RefreshCcw className="size-4" />
        </div>
      </div>

      <div className="mt-6">
        {Object.entries(sortedList).map(([label, list]) => {
          return (
            <div key={label}>
              <span className="text-xs text-[#999] px-3">{t(label)}</span>

              <ul>
                {list.map((item) => {
                  const { _id, _source } = item;

                  const isActive = _id === active?._id;
                  const title = _source?.title ?? _id;

                  return (
                    <li
                      key={_id}
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
                        className={clsx("w-1 h-6 rounded-sm bg-[#0072FF]", {
                          "opacity-0": _id !== active?._id,
                        })}
                      />

                      <div className="flex-1 flex items-center justify-between gap-2 px-2 overflow-hidden">
                        {isEdit && isActive ? (
                          <Input
                            autoFocus
                            defaultValue={title}
                            className="flex-1 -mx-px outline-none bg-transparent border border-[#0061FF] rounded-[4px]"
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;

                              onRename(item, event.currentTarget.value);

                              setIsEdit(false);
                            }}
                            onBlur={(event) => {
                              onRename(item, event.target.value);

                              setIsEdit(false);
                            }}
                          />
                        ) : (
                          <span className="truncate">{title}</span>
                        )}

                        <Menu>
                          {isActive && !isEdit && (
                            <MenuButton>
                              <Ellipsis className="size-4 text-[#979797]" />
                            </MenuButton>
                          )}

                          <MenuItems
                            anchor="bottom"
                            className="flex flex-col rounded-lg shadow-md z-100 bg-white dark:bg-[#202126] p-1 border border-black/2 dark:border-white/10"
                            onClick={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                            }}
                          >
                            {menuItems.map((menuItem) => {
                              const {
                                label,
                                icon: Icon,
                                iconColor,
                                onClick,
                              } = menuItem;

                              return (
                                <MenuItem key={label}>
                                  <button
                                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[#EDEDED] dark:hover:bg-[#2B2C31] transition"
                                    onClick={() => onClick()}
                                  >
                                    <Icon
                                      className="size-4"
                                      style={{
                                        color: iconColor,
                                      }}
                                    />

                                    <span>{t(label)}</span>
                                  </button>
                                </MenuItem>
                              );
                            })}
                          </MenuItems>
                        </Menu>
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
        <div className="fixed inset-0 flex items-center justify-center w-screen">
          <DialogPanel className="flex flex-col justify-between w-[360px] h-[160px] p-3 border border-[#e6e6e6] bg-white dark:bg-[#202126] dark:border-white/10 shadow-xl rounded-lg">
            <div className="flex flex-col gap-3">
              <DialogTitle className="text-base font-bold text-[#333]">
                {t("history_list.delete_modal.title")}
              </DialogTitle>
              <Description className="text-sm text-[#333]">
                {t("history_list.delete_modal.description", {
                  replace: [active?._source?.title || active?._id],
                })}
              </Description>
            </div>

            <div className="flex gap-4 self-end">
              <button
                className="h-8 px-4 text-sm text-[#666666] bg-[#F8F9FA] dark:text-white dark:bg-[#202126] border border-[#E6E6E6] dark:border-white/10 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                {t("history_list.delete_modal.button.cancel")}
              </button>
              <button
                className="h-8 px-4 text-sm text-white bg-[#EF4444] rounded-lg"
                onClick={() => {
                  if (!active?._id) return;

                  onRemove(active._id);

                  setIsOpen(false);
                }}
              >
                {t("history_list.delete_modal.button.delete")}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default HistoryList;
