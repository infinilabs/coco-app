import { ChevronsRight } from "lucide-react";
import { FC } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

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
      <div
        className={clsx(
          "flex-1 flex flex-col gap-1 items-center justify-center h-[90px] rounded-md border border-transparent transition bg-[#ededed] dark:bg-[#202126]",
          {
            "!border-[#881C94]": isSelected,
          }
        )}
      >
        <div className="text-xl text-[#333] dark:text-[#d8d8d8]">{result}</div>
        <div className="text-xs text-[#999] dark:text-[#666]">
          {description}
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1 w-full children:flex">
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
