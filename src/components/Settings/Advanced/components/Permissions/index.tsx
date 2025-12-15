import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMount } from "ahooks";
import { ShieldCheck, Monitor, Mic, RotateCcw } from "lucide-react";
import clsx from "clsx";

import platformAdapter from "@/utils/platformAdapter";
import SettingsItem from "@/components/Settings/SettingsItem";

const Permissions = () => {
  const { t } = useTranslation();
  const [accessibilityAuthorized, setAccessibilityAuthorized] = useState<boolean | null>(null);
  const [screenAuthorized, setScreenAuthorized] = useState<boolean | null>(null);
  const [microphoneAuthorized, setMicrophoneAuthorized] = useState<boolean | null>(null);

  const refresh = async () => {
    const [ax, sr, mic] = await Promise.all([
      platformAdapter.invokeBackend<boolean>("check_accessibility_trusted"),
      platformAdapter.checkScreenRecordingPermission(),
      platformAdapter.checkMicrophonePermission(),
    ]);
    setAccessibilityAuthorized(ax);
    setScreenAuthorized(sr);
    setMicrophoneAuthorized(mic);
  };

  useMount(refresh);

  const openAccessibilitySettings = async () => {
    const window = await platformAdapter.getCurrentWebviewWindow();
    await window.setAlwaysOnTop(false);
    await platformAdapter.invokeBackend("open_accessibility_settings");
  };

  const requestScreenRecording = async () => {
    const window = await platformAdapter.getCurrentWebviewWindow();
    await window.setAlwaysOnTop(false);
    await platformAdapter.requestScreenRecordingPermission();
    await platformAdapter.invokeBackend("open_screen_recording_settings");
    await refresh();
  };

  const requestMicrophone = async () => {
    const window = await platformAdapter.getCurrentWebviewWindow();
    await window.setAlwaysOnTop(false);
    await platformAdapter.requestMicrophonePermission();
    await platformAdapter.invokeBackend("open_microphone_settings");
    await refresh();
  };

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.permissions.title")}
      </h2>

      <div className="space-y-6">
        <SettingsItem
          icon={ShieldCheck}
          title={t("settings.advanced.permissions.accessibility.title")}
          description={t("settings.advanced.permissions.accessibility.description")}
        >
          <div className="flex items-center gap-3">
            {accessibilityAuthorized ? (
              <span className="text-sm font-medium text-green-600 dark:text-green-500">
                {t("settings.common.status.authorized")}
              </span>
            ) : (
              <span className="text-sm font-medium text-red-600 dark:text-red-500">
                {t("settings.common.status.notAuthorized")}
              </span>
            )}
            <button
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              onClick={openAccessibilitySettings}
            >
              {t("settings.common.actions.openNow")}
            </button>
            <button
              className={clsx(
                "flex items-center justify-center size-8 rounded-[6px] border border-black/5 dark:border-white/10 transition bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                { "opacity-70 cursor-not-allowed": refreshing }
              )}
              onClick={handleRefresh}
              title={t("settings.common.actions.refresh")}
            >
              <RotateCcw
                className={clsx("size-4", {
                  "animate-spin": refreshing,
                })}
              />
            </button>
          </div>
        </SettingsItem>

        <SettingsItem
          icon={Monitor}
          title={t("settings.advanced.permissions.screenRecording.title")}
          description={t("settings.advanced.permissions.screenRecording.description")}
        >
          <div className="flex items-center gap-3">
            {screenAuthorized ? (
              <span className="text-sm font-medium text-green-600 dark:text-green-500">
                {t("settings.common.status.authorized")}
              </span>
            ) : (
              <span className="text-sm font-medium text-red-600 dark:text-red-500">
                {t("settings.common.status.notAuthorized")}
              </span>
            )}
            <button
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              onClick={requestScreenRecording}
            >
              {t("settings.common.actions.openNow")}
            </button>
            <button
              className={clsx(
                "flex items-center justify-center size-8 rounded-[6px] border border-black/5 dark:border-white/10 transition bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                { "opacity-70 cursor-not-allowed": refreshing }
              )}
              onClick={handleRefresh}
              title={t("settings.common.actions.refresh")}
            >
              <RotateCcw
                className={clsx("size-4", {
                  "animate-spin": refreshing,
                })}
              />
            </button>
          </div>
        </SettingsItem>

        <SettingsItem
          icon={Mic}
          title={t("settings.advanced.permissions.microphone.title")}
          description={t("settings.advanced.permissions.microphone.description")}
        >
          <div className="flex items-center gap-3">
            {microphoneAuthorized ? (
              <span className="text-sm font-medium text-green-600 dark:text-green-500">
                {t("settings.common.status.authorized")}
              </span>
            ) : (
              <span className="text-sm font-medium text-red-600 dark:text-red-500">
                {t("settings.common.status.notAuthorized")}
              </span>
            )}
            <button
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              onClick={requestMicrophone}
            >
              {t("settings.common.actions.openNow")}
            </button>
            <button
              className={clsx(
                "flex items-center justify-center size-8 rounded-[6px] border border-black/5 dark:border-white/10 transition bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                { "opacity-70 cursor-not-allowed": refreshing }
              )}
              onClick={handleRefresh}
              title={t("settings.common.actions.refresh")}
            >
              <RotateCcw
                className={clsx("size-4", {
                  "animate-spin": refreshing,
                })}
              />
            </button>
          </div>
        </SettingsItem>
      </div>
    </>
  );
};

export default Permissions;
