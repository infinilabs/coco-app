import { useAppStore } from "@/stores/appStore";
import { ChevronsRight } from "lucide-react";
import { FC } from "react";
// @ts-ignore
import Numbo from "numbo";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface CalculatorProps {
  item: any;
  isSelected: boolean;
}

const numbo = new Numbo();

const Calculator: FC<CalculatorProps> = (props) => {
  const { item, isSelected } = props;
  const { title, content } = item;
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);

  console.log("language", language);

  const aaa = () => {
    const operators = ["+", "-", "*", "/", "%", "^"];

    const foundOperators = title
      .split("")
      .filter((item: string) => operators.includes(item));

    if (foundOperators.length === 1) {
      switch (foundOperators[0]) {
        case "+":
          return t("calculator.sum");
        case "-":
          return t("calculator.subtract");
        case "*":
          return t("calculator.multiply");
        case "/":
          return t("calculator.divide");
        case "%":
          return t("calculator.remainder");
      }
    }

    return t("calculator.expression");
  };

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
      {renderItem(title, aaa())}

      <ChevronsRight className="text-[#999999] size-5" />

      {renderItem(
        content,
        numbo.convert(content, {
          lang: language === "zh" ? "zhCN" : "enUS",
        })
      )}
    </div>
  );
};

export default Calculator;
