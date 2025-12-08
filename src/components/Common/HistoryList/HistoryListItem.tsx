import { FC, useRef, useCallback, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Ellipsis } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";

import type { Chat } from "@/types/chat";
import VisibleKey from "../VisibleKey";

interface HistoryListItemProps {
  item: Chat;
  active?: Chat;
  onSelect: (chat: Chat) => void;
  onRename: (chatId: string, title: string) => void;
  onMouseEnter: () => void;
  handleDelete: () => void;
  highlightId: string;
}

const HistoryListItem: FC<HistoryListItemProps> = ({
  item,
  active,
  onSelect,
  onRename,
  onMouseEnter,
  highlightId,
  handleDelete,
}) => {
  const { t } = useTranslation();
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const { _id, _source } = item;
  const title = _source?.title ?? _id;
  const isActive = item._id === active?._id || item._id === highlightId;

  const [isEdit, setIsEdit] = useState(false);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      moreButtonRef.current?.click();
    },
    [moreButtonRef.current]
  );

  const handleRename = useCallback(() => {
    if (highlightId) {
      setIsEdit(true);
    }
  }, [highlightId]);

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
      onClick: handleRename,
    },
    {
      label: "history_list.menu.delete",
      icon: Trash2,
      shortcut: "D",
      iconColor: "#FF2018",
      onClick: handleDelete,
    },
  ];

  return (
    <li
      key={_id}
      id={_id}
      className={clsx(
        "flex items-center mt-1 h-10 rounded-lg cursor-pointer hover:bg-[#EDEDED] dark:hover:bg-[#353F4D] transition",
        {
          "bg-[#E5E7EB] dark:bg-[#2B3444]": isActive,
        }
      )}
      onClick={() => {
        if (!isActive) {
          setIsEdit(false);
        }

        onSelect(item);
      }}
      onMouseEnter={onMouseEnter}
      onContextMenu={onContextMenu}
    >
      <div
        className={clsx("w-1 h-6 rounded-sm bg-[#0072FF]", {
          "opacity-0": item._id !== active?._id,
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

              event.stopPropagation();

              const value = event.currentTarget.value;

              onRename(item._id || "", value);

              setIsEdit(false);
            }}
            onBlur={(event) => {
              const value = event.currentTarget.value;

              onRename(item._id || "", value);

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
              <PopoverTrigger ref={moreButtonRef} className="flex gap-2">
                <VisibleKey
                  shortcut="O"
                  onKeyPress={() => {
                    moreButtonRef.current?.click();
                  }}
                >
                  <Ellipsis className="size-4 text-[#979797]" />
                </VisibleKey>
              </PopoverTrigger>
            )}

            <PopoverContent
              side="bottom"
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
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-[6px] hover:bg-[#EDEDED] dark:hover:bg-[#2B2C31] transition"
                    onClick={onClick}
                  >
                    <VisibleKey shortcut={shortcut} onKeyPress={onClick}>
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
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </li>
  );
};

export default HistoryListItem;
