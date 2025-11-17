import { useState, useEffect, cloneElement, ReactElement } from "react";
import {
  Command,
  Monitor,
  Palette,
  Moon,
  Sun,
  Power,
  Tags,
  // Trash2,
  Globe,
  PictureInPicture2,
  PanelTop,
  RectangleHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { isTauri } from "@tauri-apps/api/core";
import { isEnabled } from "@tauri-apps/plugin-autostart";
import { emit } from "@tauri-apps/api/event";
import { useCreation } from "ahooks";

import SettingsItem from "./SettingsItem";
import SettingsToggle from "./SettingsToggle";
import { ShortcutItem } from "./ShortcutItem";
import { Shortcut } from "../../types/shortcut";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { useAppStore } from "@/stores/appStore";
import { AppTheme } from "@/types/index";
import { useThemeStore } from "@/stores/themeStore";
import {
  change_autostart,
  get_current_shortcut,
  change_shortcut,
  unregister_shortcut,
} from "@/commands";
import platformAdapter from "@/utils/platformAdapter";
import clsx from "clsx";
import { useAppearanceStore, WindowMode } from "@/stores/appearanceStore";
import { Sparkles } from "lucide-react";
import { useSelectionStore } from "@/stores/selectionStore";

export function ThemeOption({
  icon: Icon,
  title,
  theme,
}: {
  icon: any;
  title: string;
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  const activeTheme = useThemeStore((state) => state.activeTheme);

  const isSelected = useCreation(() => {
    return activeTheme === theme;
  }, [activeTheme]);

  return (
    <button
      onClick={() => {
        emit("theme-changed", theme);
      }}
      className={`p-4 rounded-lg border-2 ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      } flex flex-col items-center justify-center space-y-2 transition-all`}
      title={title}
    >
      <Icon className={`w-6 h-6 ${isSelected ? "text-blue-500" : ""}`} />
      <span
        className={`text-sm font-medium ${isSelected ? "text-blue-500" : ""}`}
      >
        {t(`settings.appearance.${theme}`)}
      </span>
    </button>
  );
}

export default function GeneralSettings() {
  const { t, i18n } = useTranslation();

  const [launchAtLogin, setLaunchAtLogin] = useState(true);

  const { showTooltip, setShowTooltip, language, setLanguage } = useAppStore();
  const { windowMode, setWindowMode } = useAppearanceStore();

  const selectionEnabled = useSelectionStore((state) => state.selectionEnabled);
  const setSelectionEnabled = useSelectionStore((state) => state.setSelectionEnabled);

  const fetchAutoStartStatus = async () => {
    if (isTauri()) {
      try {
        const status = await isEnabled();
        setLaunchAtLogin(status);
      } catch (error) {
        console.error("Failed to fetch autostart status:", error);
      }
    }
  };

  const enableAutoStart = async () => {
    if (isTauri()) {
      try {
        await change_autostart(true);
      } catch (error) {
        console.error("Failed to enable autostart:", error);
      }
    }
    setLaunchAtLogin(true);
  };

  const disableAutoStart = async () => {
    if (isTauri()) {
      try {
        await change_autostart(false);
      } catch (error) {
        console.error("Failed to disable autostart:", error);
      }
    }
    setLaunchAtLogin(false);
  };

  const [shortcut, setShortcut] = useState<Shortcut>([]);

  const setShowCocoShortcuts = useAppStore((state) => {
    return state.setShowCocoShortcuts;
  });

  useEffect(() => {
    setShowCocoShortcuts(shortcut);
  }, [shortcut]);

  async function getCurrentShortcut() {
    try {
      const res: any = await get_current_shortcut();
      // console.log("get_current_shortcut: ", res);
      setShortcut(res?.split("+"));
    } catch (err) {
      console.error("Failed to fetch shortcut:", err);
    }
  }

  useEffect(() => {
    fetchAutoStartStatus();
    getCurrentShortcut();
  }, []);

  const changeShortcut = (key: Shortcut) => {
    setShortcut(key);
    //
    if (key.length === 0) return;
    change_shortcut(key?.join("+")).catch((err) => {
      console.error("Failed to save hotkey:", err);
    });
  };

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(shortcut, changeShortcut);

  const onEditShortcut = async () => {
    startEditing();
    //
    unregister_shortcut().catch((err) => {
      console.error("Failed to save hotkey:", err);
    });
  };

  const onCancelShortcut = async () => {
    cancelEditing();
    //
    change_shortcut(shortcut?.join("+")).catch((err) => {
      console.error("Failed to save hotkey:", err);
    });
  };

  const onSaveShortcut = async () => {
    saveShortcut();
  };

  // const clearAllCache = useCallback(() => {

  //   useConnectStore.persist.clearStorage();

  //   useAppStore.persist.clearStorage();
  // }, [endpoint]);

  const currentLanguage = language || i18n.language;

  const windowModes: Array<{
    icon: ReactElement;
    value: WindowMode;
  }> = [
    {
      icon: <PanelTop />,
      value: "default",
    },
    {
      icon: <RectangleHorizontal />,
      value: "compact",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.general")}
        </h2>
        <div className="space-y-6">
          <SettingsItem
            icon={Power}
            title={t("settings.startup.title")}
            description={t("settings.startup.description")}
          >
            <SettingsToggle
              checked={launchAtLogin}
              onChange={(value) =>
                value ? enableAutoStart() : disableAutoStart()
              }
              label={t("settings.startup.toggle")}
            />
          </SettingsItem>

          <SettingsItem
            icon={Command}
            title={t("settings.hotkey.title")}
            description={t("settings.hotkey.description")}
          >
            <div className="flex items-center gap-2">
              <ShortcutItem
                shortcut={shortcut}
                isEditing={isEditing}
                currentKeys={currentKeys}
                onEdit={onEditShortcut}
                onSave={onSaveShortcut}
                onCancel={onCancelShortcut}
              />
            </div>
          </SettingsItem>

          <SettingsItem
            icon={Palette}
            title={t("settings.appearance.title")}
            description={t("settings.appearance.description")}
          >
            <div></div>
          </SettingsItem>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption
              icon={Sun}
              title={t("settings.appearance.light")}
              theme="light"
            />
            <ThemeOption
              icon={Moon}
              title={t("settings.appearance.dark")}
              theme="dark"
            />
            <ThemeOption
              icon={Monitor}
              title={t("settings.appearance.auto")}
              theme="auto"
            />
          </div>

          <SettingsItem
            icon={PictureInPicture2}
            title={t("settings.windowMode.title")}
            description={t("settings.windowMode.description")}
          />
          <div className="grid grid-cols-3 gap-4">
            {windowModes.map((item) => {
              const { icon, value } = item;

              const label = t(`settings.windowMode.${value}`);

              let isSelected = value === windowMode;

              return (
                <button
                  key={value}
                  onClick={() => {
                    setWindowMode(value);
                  }}
                  className={clsx(
                    "p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 flex flex-col items-center justify-center space-y-2 transition-all",
                    {
                      "!border-blue-500 bg-blue-50 dark:bg-blue-900/20":
                        isSelected,
                    }
                  )}
                  title={label}
                >
                  {cloneElement(icon, {
                    className: clsx({
                      "text-blue-500": isSelected,
                    }),
                  })}

                  <span
                    className={clsx(`text-sm font-medium`, {
                      "text-blue-500": isSelected,
                    })}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          <SettingsItem
            icon={Sparkles}
            title={t("settings.ai.title")}
            description={t("settings.ai.description")}
          >
            <SettingsToggle
              checked={selectionEnabled}
              onChange={(value) => setSelectionEnabled(value)}
              label={t("settings.ai.toggle")}
            />
          </SettingsItem>

          <SettingsItem
            icon={Globe}
            title={t("settings.language.title")}
            description={t("settings.language.description")}
          >
            <div className="flex items-center gap-2">
              <select
                value={currentLanguage}
                onChange={(event) => {
                  const lang = event.currentTarget.value;

                  setLanguage(lang);

                  platformAdapter.invokeBackend("update_app_lang", { lang });
                }}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">{t("settings.language.english")}</option>
                <option value="zh">{t("settings.language.chinese")}</option>
              </select>
            </div>
          </SettingsItem>

          <SettingsItem
            icon={Tags}
            title={t("settings.tooltip.title")}
            description={t("settings.tooltip.description")}
          >
            <SettingsToggle
              checked={showTooltip}
              onChange={(value) => setShowTooltip(value)}
              label={t("settings.tooltip.toggle")}
            />
          </SettingsItem>
        </div>
      </div>
    </div>
  );
}
