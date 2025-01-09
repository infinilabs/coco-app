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
import ShortcutItem from "./ShortcutItem";
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

  const [errorInfo, setErrorInfo] = useState("");
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
    setShortcut(res?.split("+"))
    //
    const currentHotkey = parseHotkey(res);
    setHotkey(currentHotkey);
  }

  useEffect(() => {
    getCurrentShortcut();
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      e.code === "MetaLeft" ||
      e.code === "MetaRight" ||
      e.code === "ControlLeft" ||
      e.code === "ControlRight" ||
      e.code === "AltLeft" ||
      e.code === "AltRight" ||
      e.code === "ShiftLeft" ||
      e.code === "ShiftRight" ||
      e.code.startsWith("Key") ||
      e.code.startsWith("Digit") ||
      e.code === "Space"
    ) {
      setPressedKeys((prev) => new Set(prev).add(e.code));
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.delete(e.code);
      return next;
    });
  };

  useEffect(() => {
    if (listening) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [listening]);

  const isReservedShortcut = (hotkey: Hotkey): boolean => {
    const hotkeyStr = formatHotkeyToString(hotkey).toLowerCase();
    return RESERVED_SHORTCUTS.some((reserved) => {
      const normalizedReserved = reserved.replace(/\s+/g, "").toLowerCase();
      return hotkeyStr === normalizedReserved;
    });
  };

  const formatHotkeyToString = (hotkey: Hotkey): string => {
    const parts: string[] = [];
    if (hotkey.ctrl) parts.push("ctrl");
    if (hotkey.alt) parts.push("alt");
    if (hotkey.shift) parts.push("shift");
    if (hotkey.meta) parts.push("meta");

    if (hotkey.code.startsWith("Key")) {
      parts.push(hotkey.code.slice(3).toLowerCase());
    } else if (hotkey.code.startsWith("Digit")) {
      parts.push(hotkey.code.slice(5));
    } else if (hotkey.code === "Space") {
      parts.push("space");
    }

    return parts.join("+");
  };

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

    const hasModifier =
      currentHotkey.meta ||
      currentHotkey.ctrl ||
      currentHotkey.alt ||
      currentHotkey.shift;
    const hasMainKey = currentHotkey.code !== "";

    if (hasModifier && hasMainKey) {
      if (isReservedShortcut(currentHotkey)) {
        setErrorInfo("This shortcut is reserved by system");
        setPressedKeys(new Set());
        setListening(false);
        return;
      }

      const currentHotkeyStr = formatHotkeyToString(currentHotkey);
      const existingHotkeyStr = hotkey ? formatHotkeyToString(hotkey) : "";

      if (currentHotkeyStr === existingHotkeyStr) {
        setErrorInfo("Same as current shortcut");
      }

      setHotkey(currentHotkey);
      setPressedKeys(new Set());
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
    if (!hotkey) return "Press shortcut";
    const parts: string[] = [];

    if (hotkey.meta)
      parts.push(navigator.platform.includes("Mac") ? "⌘" : "Win");
    if (hotkey.ctrl) parts.push("Ctrl");
    if (hotkey.alt) parts.push("Alt");
    if (hotkey.shift) parts.push("Shift");

    if (hotkey.code === "Space") {
      parts.push("Space");
    } else if (hotkey.code.startsWith("Key")) {
      parts.push(hotkey.code.slice(3));
    } else if (hotkey.code.startsWith("Digit")) {
      parts.push(hotkey.code.slice(5));
    }

    const shortcut = parts.join("+");

    if (parts.length >= 2) {
      invoke("change_shortcut", { key: convertShortcut(shortcut) }).catch(
        (err) => {
          console.error("Failed to save hotkey:", err);
          setErrorInfo("Failed to save shortcut");
        }
      );
    }

    return parts.join(" + ");
  };

  const handleStartListening = () => {
    setPressedKeys(new Set());
    setListening(listening ? false : true);
  };

  const handleClearHotkey = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHotkey(null);
    setPressedKeys(new Set());
    setListening(false);
    invoke("change_shortcut", { key: "" }).catch((err) => {
      console.error("Failed to clear shortcut:", err);
    });
  };

  const DEFAULT_SHORTCUT: Shortcut = ['Control', 'S'];

  const [shortcut, setShortcut] = useState<Shortcut>(DEFAULT_SHORTCUT);

  const { isEditing, currentKeys, startEditing, saveShortcut } = useShortcutEditor(shortcut, setShortcut);

  useEffect(() => {
    invoke("change_shortcut", { key:  shortcut?.join("+")}).catch(
      (err) => {
        console.error("Failed to save hotkey:", err);
      }
    );
  }, [shortcut]);

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
                onEdit={startEditing}
                onSave={saveShortcut}
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
