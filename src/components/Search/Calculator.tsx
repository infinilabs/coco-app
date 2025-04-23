import { ChevronsRight } from "lucide-react";
import { FC } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { copyToClipboard } from "@/utils";

interface CalculatorProps {
  item: any;
  isSelected: boolean;
}

const Calculator: FC<CalculatorProps> = (props) => {
  const { item, isSelected } = props;
  const {
    payload: { query, result },
  } = item;
  const { t, i18n } = useTranslation();

  const renderItem = (result: string, description: string) => {
    return (
      <div className="flex-1 flex flex-col gap-1 items-center justify-center h-[90px] overflow-hidden rounded-[4px] border border-transparent transition bg-[#F8F8F8] dark:bg-[#141414]">
        <div className="w-[90%] text-xl text-[#333] dark:text-[#d8d8d8] truncate text-center">
          {result}
        </div>
        <div className="w-[90%] text-xs text-[#999] dark:text-[#666] truncate text-center">
          {description}
        </div>
      </div>
    );
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-1 p-2 w-full rounded-lg transition",
        {
          "bg-[#EDEDED] dark:bg-[#202126]": isSelected,
        }
      )}
      onDoubleClick={() => {
        copyToClipboard(result.value);
      }}
    >
      {renderItem(query.value, t(`calculator.${query.type}`))}

      <ChevronsRight className="text-[#999999] size-5" />

      {renderItem(
        result.value,
        i18n.language === "zh" ? result.toZh : result.toEn
      )}
    </div>
  );
};

export default Calculator;
