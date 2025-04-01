import { Chat } from "@/components/Assistant/types";
import {
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { groupBy, isNil } from "lodash-es";
import { cloneElement, FC, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import clsx from "clsx";
import {
  Ellipsis,
  Pencil,
  RefreshCcw,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/appStore";

dayjs.extend(isSameOrAfter);

interface HistoryListProps {
  list: Chat[];
  active?: Chat;
  onSearch: (keyword: string) => void;
  onRefresh: () => void;
  onSelect: (chat: Chat) => void;
  onRename: (chat: Chat) => void;
  onRemove: (chatId: string) => void;
}

const HistoryList: FC<HistoryListProps> = (props) => {
  const { list, active, onSearch, onRefresh, onSelect, onRename, onRemove } =
    props;
  const { t } = useTranslation();
  const [isEdit, setIsEdit] = useState(false);

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
    {
      label: "history_list.menu.share",
      icon: Share2,
      onClick: () => {},
    },
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
      onClick: () => {},
    },
  ];

  return (
    <div
      className={clsx(
        "h-full overflow-auto px-3 py-2 text-sm bg-[#F3F4F6] dark:bg-[#1F2937]"
      )}
    >
      <div className="flex gap-1 children:h-8">
        <div className="flex-1 flex items-center gap-2 px-2 rounded-lg border border-[#E6E6E6] bg-[#F8F9FA]">
          <Search className="size-4 text-[#6B7280]" />

          <Input
            className="bg-transparent outline-none"
            placeholder={t("history_list.search.placeholder")}
          />
        </div>

        <div className="size-8 flex items-center justify-center rounded-lg border text-[#0072FF] border-[#E6E6E6] bg-[#F3F4F6] hover:bg-[#F8F9FA] cursor-pointer transition">
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
                        "flex items-center mt-1 h-10 rounded-lg cursor-pointer hover:bg-[#F8F9FA] transition",
                        {
                          "!bg-[#E5E7EB]": isActive,
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
                            defaultValue={title}
                            className="flex-1 -mx-px outline-none bg-transparent border border-[#0061FF] rounded-[4px]"
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
                          >
                            {menuItems.map((item) => {
                              const {
                                label,
                                icon: Icon,
                                iconColor,
                                onClick,
                              } = item;

                              return (
                                <MenuItem key={label}>
                                  <button
                                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[#EDEDED] transition"
                                    onClick={onClick}
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
    </div>
  );
};

export default HistoryList;
