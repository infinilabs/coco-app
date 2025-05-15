import SettingsInput from "@/components/Settings/SettingsInput";
import SettingsItem from "@/components/Settings/SettingsItem";
import { useAppearanceStore } from "@/stores/appearanceStore";
import platformAdapter from "@/utils/platformAdapter";
import { AppWindowMac } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const Appearance = () => {
  const { t } = useTranslation();
  const opacity = useAppearanceStore((state) => state.opacity);
  const setOpacity = useAppearanceStore((state) => state.setOpacity);

  useEffect(() => {
    const unlisten = useAppearanceStore.subscribe((state) => {
      platformAdapter.emitEvent("change-appearance-store", state);
    });

    return unlisten;
  }, []);

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.appearance.title")}
      </h2>

      <SettingsItem
        icon={AppWindowMac}
        title={t("settings.advanced.appearance.opacity.title")}
        description={t("settings.advanced.appearance.opacity.description")}
      >
        <SettingsInput
          type="number"
          min={10}
          max={100}
          value={opacity}
          onChange={(value) => {
            return setOpacity(!value ? void 0 : Number(value));
          }}
        />
      </SettingsItem>
    </>
  );
};

export default Appearance;
