import { useState, useEffect } from "react";
import {
  Command,
  Monitor,
  Palette,
  Moon,
  Sun,
  Power,
  Tags,
  CircleX,
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
import { ThemeOption } from "./index2";
import { type Hotkey } from "@/utils/tauri";
import { useAppStore } from "@/stores/appStore";

const RESERVED_SHORTCUTS = [
  "ctrl+c",
  "ctrl+v",
  "ctrl+x",
  "ctrl+a",
  "ctrl+z",
  "ctrl+y",
  "ctrl+s",
];

export default function GeneralSettings() {
  const [launchAtLogin, setLaunchAtLogin] = useState(true);

  const showTooltip = useAppStore((state) => state.showTooltip);
  const setShowTooltip = useAppStore((state) => state.setShowTooltip);

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

  async function getCurrentShortcut() {
    const res: any = await invoke("get_current_shortcut");
    setShortcut(res?.split("+"));
  }

  useEffect(() => {
    getCurrentShortcut();
  }, []);

  const [shortcut, setShortcut] = useState<Shortcut>([]);

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(shortcut, setShortcut);

  useEffect(() => {
    if (shortcut.length === 0) return;
    invoke("change_shortcut", { key: shortcut?.join("+") }).catch((err) => {
      console.error("Failed to save hotkey:", err);
      startEditing();
    });
  }, [shortcut]);

  const onEditShortcut = async () => {
    startEditing();
    //
    invoke("change_shortcut", { key: "" }).catch((err) => {
      console.error("Failed to save hotkey:", err);
      startEditing();
    });
  };

  const onCancelShortcut = async () => {
    cancelEditing();
    //
    invoke("change_shortcut", { key: shortcut?.join("+") }).catch((err) => {
      console.error("Failed to save hotkey:", err);
      startEditing();
    });
  };

  const onSaveShortcut = async () => {
    saveShortcut();
  };

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
        </div>
      </div>
    </div>
  );
}
