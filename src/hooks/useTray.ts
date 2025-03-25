import { useTranslation } from "react-i18next";
import { TrayIcon, type TrayIconOptions } from "@tauri-apps/api/tray";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { useUpdateEffect } from "ahooks";
import { exit } from "@tauri-apps/plugin-process";

import { isMac } from "@/utils/platform";
import { useAppStore } from "@/stores/appStore";
import { show_coco, show_settings } from "@/commands";

const TRAY_ID = "COCO_TRAY";

export const useTray = () => {
  const { t, i18n } = useTranslation();
  const showCocoShortcuts = useAppStore((state) => state.showCocoShortcuts);

  useUpdateEffect(() => {
    if (showCocoShortcuts.length === 0) return;

    updateTrayMenu();
  }, [i18n.language, showCocoShortcuts]);

  const getTrayById = () => {
    return TrayIcon.getById(TRAY_ID);
  };

  const createTrayIcon = async () => {
    const tray = await getTrayById();

    if (tray) return;

    const menu = await getTrayMenu();

    const iconPath = isMac ? "assets/tray-mac.ico" : "assets/tray.ico";
    const icon = await resolveResource(iconPath);

    const options: TrayIconOptions = {
      menu,
      icon,
      id: TRAY_ID,
      iconAsTemplate: true,
    };

    return TrayIcon.new(options);
  };

  const getTrayMenu = async () => {
    const items = await Promise.all([
      MenuItem.new({
        text: t("tray.showCoco"),
        accelerator: showCocoShortcuts.join("+"),
        action: () => {
          show_coco()()
        },
      }),
      PredefinedMenuItem.new({ item: "Separator" }),
      MenuItem.new({
        text: t("tray.settings"),
        // accelerator: "CommandOrControl+,",
        action: () => {
          show_settings()()
        },
      }),
      PredefinedMenuItem.new({ item: "Separator" }),
      MenuItem.new({
        text: t("tray.quitCoco"),
        accelerator: "CommandOrControl+Q",
        action: () => {
          exit(0);
        },
      }),
    ]);

    return Menu.new({ items });
  };

  const updateTrayMenu = async () => {
    const tray = await getTrayById();

    if (!tray) {
      return createTrayIcon();
    }

    const menu = await getTrayMenu();

    tray.setMenu(menu);
  };
};
