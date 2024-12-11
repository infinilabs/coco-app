import { useState, useEffect } from "react";
import {
  Command,
  Monitor,
  Palette,
  Moon,
  Sun,
} from "lucide-react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";

import SettingsItem from "./SettingsItem";
import SettingsSelect from "./SettingsSelect";
import SettingsToggle from "./SettingsToggle";
import { ThemeOption } from "./index2";
import { type Hotkey } from "../../utils/tauri";

interface GeneralSettingsProps {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export default function GeneralSettings({
  theme,
  setTheme,
}: GeneralSettingsProps) {
  const [launchAtLogin, setLaunchAtLogin] = useState(true);

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
        await enable();
      } catch (error) {
        console.error("Failed to enable autostart:", error);
      }
    }
    setLaunchAtLogin(true);
  };

  const disableAutoStart = async () => {
    if (isTauri()) {
      try {
        await disable();
      } catch (error) {
        console.error("Failed to disable autostart:", error);
      }
    }
    setLaunchAtLogin(false);
  };

  const [listening, setListening] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [hotkey, setHotkey] = useState<Hotkey | null>({
    alt: false,
    code: "",
    ctrl: false,
    meta: true,
    shift: true,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setPressedKeys((prev) => new Set(prev).add(e.code));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    };

    if (listening) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    }

    return () => {
      if (listening) {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      }
    };
  }, [listening]);

  useEffect(() => {
    if (pressedKeys.size === 0) return;

    const currentHotkey: Hotkey = {
      meta: pressedKeys.has("MetaLeft") || pressedKeys.has("MetaRight"),
      ctrl: pressedKeys.has("ControlLeft") || pressedKeys.has("ControlRight"),
      shift: pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight"),
      alt: pressedKeys.has("AltLeft") || pressedKeys.has("AltRight"),
      code:
        Array.from(pressedKeys).find(
          (key) =>
            key.startsWith("Key") || key.startsWith("Digit") || key === "Space"
        ) ?? "",
    };

    setHotkey(currentHotkey);

    if (currentHotkey.code) {
      setListening(false);
    }
  }, [pressedKeys]);

  const convertShortcut = (shortcut: string): string => {
    return shortcut
      .replace(/⌘/g, "command")
      .replace(/⇧/g, "shift")
      .replace(/⎇/g, "alt")
      .replace(/control/i, "ctrl")
      .toLowerCase()
      .replace(/\s+/g, "")
      .trim();
  };

  const formatHotkey = (hotkey: Hotkey | null): string => {
    if (!hotkey) return "None";
    const parts: string[] = [];
    if (hotkey.meta) parts.push("⌘");
    if (hotkey.ctrl) parts.push("Ctrl");
    if (hotkey.alt) parts.push("Alt");
    if (hotkey.shift) parts.push("Shift");
    if (hotkey.code === "Space" || hotkey.code === "") parts.push("Space");
    else if (hotkey.code.startsWith("Key")) parts.push(hotkey.code.slice(3));
    else if (hotkey.code.startsWith("Digit")) parts.push(hotkey.code.slice(5));

    const shortcut = parts.join("+");

    // Save the hotkey immediately
    invoke("change_shortcut", { key: convertShortcut(shortcut) }).catch((err) =>
      console.error("Failed to save hotkey:", err)
    );

    return parts.join(" + ");
  };

  const handleStartListening = () => {
    setPressedKeys(new Set());
    setHotkey(null);
    setListening(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          General Settings
        </h2>
        <div className="space-y-6">
          <SettingsItem
            icon={Command}
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
            <button
              onClick={handleStartListening}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              {listening ? "Listening..." : formatHotkey(hotkey)}
            </button>
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
