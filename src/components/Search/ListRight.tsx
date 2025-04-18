import TypeIcon from "@/components/Common/Icons/TypeIcon";
import RichIcon from "@/components/Common/Icons/RichIcon";
import VisibleKey from "../Common/VisibleKey";
import clsx from "clsx";

interface ListRightProps {
  item: any;
  isSelected: boolean;
  showIndex: boolean;
  currentIndex: number;
  goToTwoPage?: (item: any) => void;
}

export default function ListRight({
  item,
  isSelected,
  showIndex,
  currentIndex,
  goToTwoPage,
}: ListRightProps) {
  return (
    <div
      className={`flex flex-1 text-right min-w-[160px] pl-5 justify-end w-full h-full text-[12px] gap-2 items-center relative`}
    >
      {item?.rich_categories ? null : (
        <div
          className={`w-4 h-4 cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            goToTwoPage && goToTwoPage(item);
          }}
        >
          <TypeIcon
            item={item}
            className="w-4 h-4 cursor-pointer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              goToTwoPage && goToTwoPage(item);
            }}
          />
        </div>
      )}

      {item?.rich_categories ? (
        <div className="flex items-center justify-end max-w-[calc(100%-20px)] whitespace-nowrap">
          <RichIcon
            item={item}
            className={`w-4 h-4 mr-2 cursor-pointer`}
            onClick={(e) => {
              e.stopPropagation();
              goToTwoPage && goToTwoPage(item);
            }}
          />
          <span
            className={`${
              isSelected ? "text-[#C8C8C8]" : "text-[#666]"
            } text-right truncate`}
          >
            {item?.rich_categories?.map((rich_item: any, index: number) => {
              if (
                item?.rich_categories.length > 2 &&
                index === item?.rich_categories.length - 1
              )
                return "";
              return (index !== 0 ? "/" : "") + rich_item?.label;
            })}
          </span>
          {item?.rich_categories.length > 2 ? (
            <span
              className={`${
                isSelected ? "text-[#C8C8C8]" : "text-[#666]"
              } text-right truncate`}
            >
              {"/" + item?.rich_categories?.at(-1)?.label}
            </span>
          ) : null}
        </div>
      ) : item?.category || item?.subcategory ? (
        <span
          className={`text-[12px] truncate ${
            isSelected ? "text-[#DCDCDC]" : "text-[#999] dark:text-[#666]"
          }`}
        >
          {(item?.category || "") +
            (item?.subcategory ? `/${item?.subcategory}` : "")}
        </span>
      ) : (
        <span
          className={`text-[12px] truncate ${
            isSelected ? "text-[#DCDCDC]" : "text-[#999] dark:text-[#666]"
          }`}
        >
          {item?.last_updated_by?.user?.username ||
            item?.owner?.username ||
            item?.updated ||
            item?.created ||
            item?.type ||
            ""}
        </span>
      )}

      {isSelected && (
        <VisibleKey
          shortcut="↩︎"
          rootClassName={clsx("!absolute", [
            showIndex && currentIndex < 10 ? "right-9" : "right-2",
          ])}
          shortcutClassName={clsx({
            "!shadow-[-6px_0px_6px_2px_#950599]": isSelected,
          })}
        />
      )}

      {showIndex && currentIndex < 10 && (
        <VisibleKey
          shortcut={String(currentIndex === 9 ? 0 : currentIndex + 1)}
          rootClassName="!absolute right-2"
          shortcutClassName={clsx({
            "!shadow-[-6px_0px_6px_2px_#950599]": isSelected,
          })}
        />
      )}
    </div>
  );
}
