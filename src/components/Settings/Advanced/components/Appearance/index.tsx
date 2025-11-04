import SettingsInput from "@/components/Settings/SettingsInput";
import SettingsItem from "@/components/Settings/SettingsItem";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { AppWindowMac } from "lucide-react";
import { useTranslation } from "react-i18next";

const Appearance = () => {
  const { t } = useTranslation();
  const { normalOpacity, setNormalOpacity, blurOpacity, setBlurOpacity } =
    useAppearanceStore();

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.appearance.title")}
      </h2>

      <SettingsItem
        icon={AppWindowMac}
        title={t("settings.advanced.appearance.normalOpacity.title")}
        description={t(
          "settings.advanced.appearance.normalOpacity.description"
        )}
      >
        <SettingsInput
          type="number"
          min={10}
          max={100}
          value={normalOpacity}
          onChange={(value) => {
            return setNormalOpacity(!value ? 100 : Number(value));
          }}
        />
      </SettingsItem>

      <SettingsItem
        icon={AppWindowMac}
        title={t("settings.advanced.appearance.blurOpacity.title")}
        description={t("settings.advanced.appearance.blurOpacity.description")}
      >
        <SettingsInput
          type="number"
          min={10}
          max={100}
          value={blurOpacity}
          onChange={(value) => {
            return setBlurOpacity(!value ? 30 : Number(value));
          }}
        />
      </SettingsItem>
    </>
  );
};

export default Appearance;
