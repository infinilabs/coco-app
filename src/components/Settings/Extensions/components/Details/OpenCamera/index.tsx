import { useTranslation } from "react-i18next";

const OpenCamera = () => {
  const { t } = useTranslation();

  return (
    <div className="text-[#999]">
      {t("settings.extensions.openCamera.description")}
    </div>
  );
};

export default OpenCamera;
