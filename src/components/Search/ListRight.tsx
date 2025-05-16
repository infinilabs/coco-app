import clsx from "clsx";

import CommonIcon from "@/components/Common/Icons/CommonIcon";
import VisibleKey from "@/components/Common/VisibleKey";

interface ListRightProps {
  item: any;
  isSelected: boolean;
  showIndex: boolean;
  currentIndex: number;
  goToTwoPage?: () => void;
}

export interface RichCategoriesProps {
  item: any;
  isSelected: boolean;
  goToTwoPage?: () => void;
}

export function RichCategories({
  item,
  isSelected,
  goToTwoPage,
}: RichCategoriesProps) {
  return (
    <>
      {item?.rich_categories ? (
        <div className="flex items-center justify-end max-w-[calc(100%-20px)] whitespace-nowrap">
          <CommonIcon
            item={item}
            renderOrder={["item_icon", "connector_icon"]}
            itemIcon={item?.rich_categories?.[0]?.icon}
            className={`w-4 h-4 mr-2 cursor-pointer`}
            onClick={(e) => {
              e.stopPropagation();
              goToTwoPage && goToTwoPage();
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
      ) : (
        <>
          <div
            className={`w-4 h-4 cursor-pointer`}
            onClick={(e) => {
              e.stopPropagation();
              goToTwoPage && goToTwoPage();
            }}
          >
            <CommonIcon
              item={item}
              renderOrder={["item_icon", "connector_icon"]}
              itemIcon={item?.source?.icon}
              className="w-4 h-4 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                goToTwoPage && goToTwoPage();
              }}
            />
          </div>
          {item?.category || item?.subcategory ? (
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
        </>
      )}
    </>
  );
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
      <RichCategories
        item={item}
        isSelected={false}
        goToTwoPage={goToTwoPage}
      />

      {isSelected && (
        <VisibleKey
          shortcut="↩︎"
          rootClassName={clsx("!absolute", [
            showIndex && currentIndex < 10 ? "right-9" : "right-2",
          ])}
        />
      )}

      {showIndex && currentIndex < 10 && (
        <VisibleKey
          shortcut={String(currentIndex === 9 ? 0 : currentIndex + 1)}
          rootClassName="!absolute right-2"
        />
      )}
    </div>
  );
}
