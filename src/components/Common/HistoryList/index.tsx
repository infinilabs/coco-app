import { Chat } from "@/components/Assistant/types";
import {
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { groupBy, isNil } from "lodash-es";
import { FC, useMemo } from "react";
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
      icon: <Share2 />,
      onClick: () => {},
    },
    {
      label: "重命名",
      icon: <Pencil />,
      onClick: () => {},
    },
    {
      label: "删除",
      icon: <Trash2 />,
      onClick: () => {},
    },
  ];

  return (
    <div className={clsx("h-full overflow-auto px-3 py-2 text-sm")}>
      <div className="flex items-center gap-2 h-8 mb-6 px-2">
        <Search className="h-4 min-w-4" />

        <Input className="bg-transparent outline-none" placeholder="Search" />
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

                  return (
                    <li
                      key={_id}
                      className={clsx(
                        "flex items-center h-10 rounded-lg cursor-pointer",
                        {
                          "bg-black/5": isActive,
                        }
                      )}
                      onClick={() => onSelect(item)}
                    >
                      <div
                        className={clsx("w-1 h-6 rounded-sm bg-[#0072FF]", {
                          "opacity-0": _id !== active?._id,
                        })}
                      />

                      <div className="flex-1 flex items-center justify-between gap-2 px-2 overflow-hidden">
                        <span className="truncate">
                          {_source?.title ?? _id}
                        </span>

                        <Menu>
                          <MenuButton>
                            {isActive && <Ellipsis className="size-4" />}
                          </MenuButton>

                          <MenuItems
                            anchor="bottom"
                            className="flex flex-col rounded-lg shadow-md z-100"
                          >
                            {menuItems.map((item) => {
                              const { label, icon, onClick } = item;

                              return (
                                <MenuItem key={label}>
                                  <button className="flex">
                                    {icon}

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
