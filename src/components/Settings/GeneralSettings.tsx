import { useState, useEffect } from "react";
import { Command, Monitor, Palette, Moon, Sun } from "lucide-react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import {
  isEnabled,
  // enable, disable
} from "@tauri-apps/plugin-autostart";

import SettingsItem from "./SettingsItem";
import SettingsSelect from "./SettingsSelect";
import SettingsToggle from "./SettingsToggle";
import { ThemeOption } from "./index2";
import { type Hotkey } from "../../utils/tauri";
import { useTheme } from '../../contexts/ThemeContext';

export default function GeneralSettings() {
  const { theme, changeTheme } = useTheme();

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

  const [listening, setListening] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [hotkey, setHotkey] = useState<Hotkey | null>(null);

  const parseHotkey = (hotkeyString: string): Hotkey | null => {
    if (!hotkeyString || hotkeyString === "None") return null;

    const hotkey: Hotkey = {
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
      code: "",
    };

    const parts = hotkeyString
      .split("+")
      .map(
        (item: any) =>
          item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
      );

    parts.forEach((part) => {
      if (part === "⌘") hotkey.meta = true; // "⌘" -> meta
      else if (part === "Super") hotkey.meta = true; // "Win" -> meta
      else if (part === "Ctrl") hotkey.ctrl = true; // "Ctrl" -> ctrl
      else if (part === "Alt") hotkey.alt = true; // "Alt" -> alt
      else if (part === "Shift") hotkey.shift = true; // "Shift" -> shift
      else if (part === "Space")
        hotkey.code = "Space"; // "Space" -> code = "Space"
      else if (part.startsWith("Key"))
        hotkey.code = `Key${part.slice(3)}`; // "Key" -> "KeyA"
      else if (part.startsWith("Digit"))
        hotkey.code = `Digit${part.slice(5)}`; // "Digit" -> "Digit1"
      else hotkey.code = `Key${part}`;
    });

    return hotkey;
  };

  async function getCurrentShortcut() {
    const res: any = await invoke("get_current_shortcut");
    const currentHotkey = parseHotkey(res);
    setHotkey(currentHotkey);
  }

  useEffect(() => {
    getCurrentShortcut()
  }, []);

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
              options={["light", "dark", "auto"]}
              value={theme}
              onChange={(value: any) => changeTheme(value)}
            />
          </SettingsItem>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption icon={Sun} title="Light" theme="light" />
            <ThemeOption icon={Moon} title="Dark" theme="dark" />
            <ThemeOption icon={Monitor} title="Auto" theme="auto" />
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
