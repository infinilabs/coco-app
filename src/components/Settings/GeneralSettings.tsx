import { useState } from "react";
import {
  Command,
  Monitor,
  Palette,
  Layout,
  Star,
  Moon,
  Sun
} from "lucide-react";

import SettingsItem from "./SettingsItem";
import SettingsSelect from "./SettingsSelect";
import SettingsToggle from "./SettingsToggle";
import { ThemeOption } from "./index2";

interface GeneralSettingsProps {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export default function GeneralSettings({
  theme,
  setTheme,
}: GeneralSettingsProps) {
  const [launchAtLogin, setLaunchAtLogin] = useState(true);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          General Settings
        </h2>
        <div className="space-y-6">
          <SettingsItem
            icon={Command}
            title="Launch at Login"
            description="Automatically start Coco when you login"
          >
            <SettingsToggle
              checked={launchAtLogin}
              onChange={setLaunchAtLogin}
              label="Launch at login"
            />
          </SettingsItem>

          <SettingsItem
            icon={Command}
            title="Coco Hotkey"
            description="Global shortcut to open Coco"
          >
            <button className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
              ⌘ Space
            </button>
          </SettingsItem>

          <SettingsItem
            icon={Monitor}
            title="Window Mode"
            description="Choose how Coco appears on your screen"
          >
            <SettingsSelect
              options={["Standard Window", "Compact Mode", "Full Screen"]}
            />
          </SettingsItem>

          <SettingsItem
            icon={Palette}
            title="Appearance"
            description="Choose your preferred theme"
          >
            <SettingsSelect
              options={["Light", "Dark", "system"]}
              value={theme}
              onChange={(value) =>
                setTheme(value as "light" | "dark" | "system")
              }
            />
          </SettingsItem>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption icon={Sun} title="Light" theme="light" />
            <ThemeOption icon={Moon} title="Dark" theme="dark" />
            <ThemeOption icon={Monitor} title="System" theme="system" />
          </div>

          <SettingsItem
            icon={Layout}
            title="Text Size"
            description="Adjust the application text size"
          >
            <SettingsSelect options={["Small", "Medium", "Large"]} />
          </SettingsItem>

          <SettingsItem
            icon={Star}
            title="Favorites"
            description="Manage your favorite commands"
          >
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200">
              Manage Favorites
            </button>
          </SettingsItem>
        </div>
      </div>
    </div>
  );
}
