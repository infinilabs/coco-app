import TypeIcon from "@/components/Common/Icons/TypeIcon";
import RichIcon from "@/components/Common/Icons/RichIcon";
import { useAppStore } from "@/stores/appStore";

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
  const isTauri = useAppStore((state) => state.isTauri);

  return (
    <div
      className={`flex flex-1 ${
        isTauri
          ? "text-right min-w-[160px] pl-5 justify-end"
          : "md:text-right text-left md:min-w-[160px] md:pl-5 md:justify-end justify-start"
      } w-full h-full text-[12px] gap-2 items-center relative`}
    >
      {item?.rich_categories ? null : (
        <div
          className={`${
            isTauri ? "" : "hidden md:inline-block"
          } w-4 h-4 cursor-pointer`}
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
            className={`${
              isTauri ? "" : "hidden md:inline-block"
            } w-4 h-4 mr-2 cursor-pointer`}
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

      {isSelected ? (
        <div
          className={`absolute ${
            showIndex && currentIndex < 10 ? "right-7" : "right-0"
          } w-4 h-4 flex items-end justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
            isSelected
              ? "shadow-[-6px_0px_6px_2px_#950599]"
              : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
          }`}
        >
          ↩︎
        </div>
      ) : null}

      {showIndex && currentIndex < 10 ? (
        <div
          className={`absolute right-0 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md ${
            isSelected
              ? "shadow-[-6px_0px_6px_2px_#950599]"
              : "shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]"
          }`}
        >
          {currentIndex}
        </div>
      ) : null}
    </div>
  );
}
