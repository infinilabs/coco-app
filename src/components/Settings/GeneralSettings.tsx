import { useState, useEffect } from "react";
import {
  Command,
  Monitor,
  Palette,
  Moon,
  Sun,
  Power,
  Tags,
  // Trash2,
} from "lucide-react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import {
  isEnabled,
  // enable, disable
} from "@tauri-apps/plugin-autostart";

import SettingsItem from "./SettingsItem";
import SettingsToggle from "./SettingsToggle";
import { ShortcutItem } from "./ShortcutItem";
import { Shortcut } from "./shortcut";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { useAppStore } from "@/stores/appStore";
import {AppTheme} from "@/utils/tauri.ts";
import {useTheme} from "@/contexts/ThemeContext.tsx";
// import { useAuthStore } from "@/stores/authStore";
// import { useConnectStore } from "@/stores/connectStore";


export function ThemeOption({
                              icon: Icon,
                              title,
                              theme,
                            }: {
  icon: any;
  title: string;
  theme: AppTheme;
}) {
  const { theme: currentTheme, changeTheme } = useTheme();

  const isSelected = currentTheme === theme;

  return (
      <button
          onClick={() => changeTheme(theme)}
          className={`p-4 rounded-lg border-2 ${
              isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          } flex flex-col items-center justify-center space-y-2 transition-all`}
      >
        <Icon className={`w-6 h-6 ${isSelected ? "text-blue-500" : ""}`} />
        <span
            className={`text-sm font-medium ${isSelected ? "text-blue-500" : ""}`}
        >
        {title}
      </span>
      </button>
  );
}

export default function GeneralSettings() {
  const [launchAtLogin, setLaunchAtLogin] = useState(true);

  const showTooltip = useAppStore((state) => state.showTooltip);
  const setShowTooltip = useAppStore((state) => state.setShowTooltip);

  // const setAuth = useAuthStore((state) => state.setAuth);
  // const setUserInfo = useAuthStore((state) => state.setUserInfo);
  // const endpoint = useAppStore((state) => state.endpoint);

  useEffect(() => {
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

    fetchAutoStartStatus();
  }, []);

  const enableAutoStart = async () => {
    if (isTauri()) {
      try {
        // await enable();
        invoke("change_autostart", { open: true });
      } catch (error) {
        console.error("Failed to enable autostart:", error);
      }
    }
    setLaunchAtLogin(true);
  };

  const disableAutoStart = async () => {
    if (isTauri()) {
      try {
        // await disable();
        invoke("change_autostart", { open: false });
      } catch (error) {
        console.error("Failed to disable autostart:", error);
      }
    }
    setLaunchAtLogin(false);
  };

  const [shortcut, setShortcut] = useState<Shortcut>([]);

  async function getCurrentShortcut() {
    try {
      const res: any = await invoke("get_current_shortcut");
      console.log("DBG: ", res);
      setShortcut(res?.split("+"));
    } catch (err) {
      console.error("Failed to fetch shortcut:", err);
    }
  }

  useEffect(() => {
    getCurrentShortcut();
  }, []);

  const changeShortcut = (key: Shortcut) => {
    setShortcut(key);
    //
    if (key.length === 0) return;
    invoke("change_shortcut", { key: key?.join("+") }).catch((err) => {
      console.error("Failed to save hotkey:", err);
    });
  };

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(shortcut, changeShortcut);

  const onEditShortcut = async () => {
    startEditing();
    //
    invoke("unregister_shortcut").catch((err) => {
      console.error("Failed to save hotkey:", err);
    });
  };

  const onCancelShortcut = async () => {
    cancelEditing();
    //
    invoke("change_shortcut", { key: shortcut?.join("+") }).catch((err) => {
      console.error("Failed to save hotkey:", err);
    });
  };

  const onSaveShortcut = async () => {
    saveShortcut();
  };

  // const clearAllCache = useCallback(() => {
  //   setAuth(undefined, endpoint);
  //   setUserInfo({}, endpoint);

  //   useConnectStore.persist.clearStorage();

  //   useAppStore.persist.clearStorage();
  // }, [endpoint]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          General Settings
        </h2>
        <div className="space-y-6">
          <SettingsItem
            icon={Power}
            title="Startup"
            description="Automatically start Coco when you login"
          >
            <SettingsToggle
              checked={launchAtLogin}
              onChange={(value) =>
                value ? enableAutoStart() : disableAutoStart()
              }
              label="Launch at login"
            />
          </SettingsItem>

          <SettingsItem
            icon={Command}
            title="Coco Hotkey"
            description="Global shortcut to open Coco"
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

          {/* <SettingsItem
            icon={Monitor}
            title="Window Mode"
            description="Choose how Coco appears on your screen"
          >
            <SettingsSelect
              options={["Standard Window", "Compact Mode", "Full Screen"]}
            />
          </SettingsItem> */}

          <SettingsItem
            icon={Palette}
            title="Appearance"
            description="Choose your preferred theme"
          >
            <div></div>
          </SettingsItem>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption icon={Sun} title="Light" theme="light" />
            <ThemeOption icon={Moon} title="Dark" theme="dark" />
            <ThemeOption icon={Monitor} title="Auto" theme="auto" />
          </div>

          <SettingsItem
            icon={Tags}
            title="Tooltip"
            description="Tooltip display for shortcut keys"
          >
            <SettingsToggle
              checked={showTooltip}
              onChange={(value) => setShowTooltip(value)}
              label="Tooltip display"
            />
          </SettingsItem>

          {/* <SettingsItem
            icon={Layout}
            title="Text Size"
            description="Adjust the application text size"
          >
            <SettingsSelect options={["Small", "Medium", "Large"]} />
          </SettingsItem> */}

          {/* <SettingsItem
            icon={Star}
            title="Favorites"
            description="Manage your favorite commands"
          >
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200">
              Manage Favorites
            </button>
          </SettingsItem> */}

          {/* <SettingsItem
            icon={Trash2}
            title="Clear Cache"
            description="Clear cached data and settings"
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={clearAllCache}
                  className=" px-4 py-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Clear All Cache
                </button>
              </div>
            </div>
          </SettingsItem> */}
        </div>
      </div>
    </div>
  );
}
