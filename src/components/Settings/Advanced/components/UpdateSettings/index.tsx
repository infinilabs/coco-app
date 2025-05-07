import SettingsItem from "@/components/Settings/SettingsItem";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import { useAppearanceStore } from "@/stores/appearance";
import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";

const UpdateSettings = () => {
  const { t } = useTranslation();
  const snapshotUpdate = useAppearanceStore((state) => state.snapshotUpdate);
  const setSnapshotUpdate = useAppearanceStore((state) => {
    return state.setSnapshotUpdate;
  });

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.updateVersion.title")}
      </h2>

      <SettingsItem
        icon={FlaskConical}
        title={t("settings.advanced.updateVersion.snapshotUpdate.title")}
        description={t(
          "settings.advanced.updateVersion.snapshotUpdate.description"
        )}
      >
        <SettingsToggle
          label={t("settings.advanced.updateVersion.snapshotUpdate.title")}
          checked={snapshotUpdate}
          onChange={() => {
            setSnapshotUpdate(!snapshotUpdate);
          }}
        />
      </SettingsItem>
    </>
  );
};

export default UpdateSettings;
