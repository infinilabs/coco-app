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
import { Ellipsis, Pencil, Search, Share2, Trash2 } from "lucide-react";

dayjs.extend(isSameOrAfter);

interface HistoryListProps {
  list: Chat[];
  active?: Chat;
  onSelect: (chat: Chat) => void;
  onSearch: (keyword: string) => void;
  onRename: (chat: Chat) => void;
  onRemove: (chatId: string) => void;
}

const HistoryList: FC<HistoryListProps> = (props) => {
  const { list, active, onSelect, onSearch, onRename, onRemove } = props;

  const [isEdit, setIsEdit] = useState(false);

  const sortedList = useMemo(() => {
    if (isNil(list)) return {};

    const now = dayjs();

    return groupBy(list, (chat) => {
      const date = dayjs(chat._source?.updated);

      if (date.isSame(now, "day")) {
        return "今天";
      }

      if (date.isSame(now.subtract(1, "day"), "day")) {
        return "昨天";
      }

      if (date.isSameOrAfter(now.subtract(7, "day"), "day")) {
        return "过去 7 天";
      }

      if (date.isSameOrAfter(now.subtract(30, "day"), "day")) {
        return "过去 30 天";
      }

      return date.format("YYYY-MM");
    });
  }, [list]);

  const menuItems = [
    {
      label: "分享",
      icon: Share2,
      onClick: () => {},
    },
    {
      label: "重命名",
      icon: Pencil,
      onClick: () => {
        setIsEdit(true);
      },
    },
    {
      label: "删除",
      icon: Trash2,
      iconColor: "#FF2018",
      onClick: () => {},
    },
  ];

  return (
    <div className={clsx("h-full overflow-auto px-3 py-2 text-sm")}>
      <div className="flex items-center gap-2 h-8 mb-6 px-2  dark:bg-[#2B3444] rounded-lg">
        <Search className="h-4 min-w-4 dark:text-[#6B7280]" />

        <Input
          className="bg-transparent outline-none text-[#999]"
          placeholder="Search"
        />
      </div>

      <div>
        {Object.entries(sortedList).map(([label, list]) => {
          return (
            <div key={label}>
              <span className="text-xs">{label}</span>

              <ul className="mt-1">
                {list.map((item) => {
                  const { _id, _source } = item;

                  const isActive = _id === active?._id;
                  const title = _source?.title ?? _id;

                  return (
                    <li
                      key={_id}
                      className={clsx(
                        "flex items-center h-10 rounded-lg cursor-pointer",
                        {
                          "bg-[#2B3444]": isActive,
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
                              <Ellipsis className="size-4 dark:text-[#979797]" />
                            </MenuButton>
                          )}

                          <MenuItems
                            anchor="bottom"
                            className="flex flex-col rounded-lg shadow-md z-100 dark:bg-[#202126] p-1 border dark:border-white/10"
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
                                    className="flex items-center gap-2 px-3 py-2 text-sm"
                                    onClick={onClick}
                                  >
                                    <Icon
                                      className="size-4"
                                      style={{
                                        color: iconColor,
                                      }}
                                    />

                                    <span>{label}</span>
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
