import { useTranslation } from "react-i18next";

const Calculator = () => {
  const { t } = useTranslation();

  return (
    <div className="text-[#999]">
      {t("settings.extensions.calculator.description")}
    </div>
  );
};

export default Calculator;
