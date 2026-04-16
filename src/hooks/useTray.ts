import { useTranslation } from "react-i18next";
import { TrayIcon, type TrayIconOptions } from "@tauri-apps/api/tray";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { useUpdateEffect } from "ahooks";
import { exit } from "@tauri-apps/plugin-process";
import { info, warn, error as logError } from "@tauri-apps/plugin-log";

import { isMac } from "@/utils/platform";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { show_coco, show_settings, show_check } from "@/commands";
import { useSelectionStore } from "@/stores/selectionStore";

const TRAY_ID = "COCO_TRAY";

let trayCreating = false;

export const useTray = () => {
  const { t, i18n } = useTranslation();
  const showCocoShortcuts = useAppStore((state) => state.showCocoShortcuts);

  const selectionEnabled = useSelectionStore((state) => state.selectionEnabled);
  // const setSelectionEnabled = useSelectionStore((state) => state.setSelectionEnabled);

  useUpdateEffect(() => {
    if (showCocoShortcuts.length === 0) return;

    info(
      `[Tray] useUpdateEffect triggered, language=${i18n.language}, shortcuts=${showCocoShortcuts}, selectionEnabled=${selectionEnabled}`,
    );

    updateTrayMenu();
  }, [i18n.language, showCocoShortcuts, selectionEnabled]);

  const getTrayById = async () => {
    const tray = await TrayIcon.getById(TRAY_ID);
    info(`[Tray] getTrayById: ${tray ? "found" : "not found"}`);
    return tray;
  };

  const createTrayIcon = async () => {
    info(`[Tray] createTrayIcon called, trayCreating: ${trayCreating}`);

    if (trayCreating) {
      warn("[Tray] createTrayIcon skipped: already creating");
      return;
    }

    const tray = await getTrayById();

    if (tray) {
      info("[Tray] createTrayIcon skipped: tray already exists");
      return;
    }

    trayCreating = true;
    info("[Tray] creating new tray icon...");

    try {
      const menu = await getTrayMenu();

      const iconPath = isMac ? "assets/tray-mac.ico" : "assets/tray.ico";
      const icon = await resolveResource(iconPath);

      const options: TrayIconOptions = {
        menu,
        icon,
        id: TRAY_ID,
        iconAsTemplate: true,
      };

      const newTray = await TrayIcon.new(options);
      info("[Tray] tray icon created successfully");
      return newTray;
    } catch (err) {
      logError(`[Tray] createTrayIcon error: ${err}`);
    } finally {
      trayCreating = false;
    }
  };

  const getTrayMenu = async () => {
    const itemPromises: Promise<any>[] = [];

    itemPromises.push(
      MenuItem.new({
        text: t("tray.showCoco"),
        accelerator: showCocoShortcuts.join("+"),
        action: () => {
          show_coco();
        },
      }),
    );

    itemPromises.push(PredefinedMenuItem.new({ item: "Separator" }));

    // if (isMac) {
    //   itemPromises.push(
    //     MenuItem.new({
    //       text: selectionEnabled
    //         ? t("tray.selectionDisable")
    //         : t("tray.selectionEnable"),
    //       action: async () => {
    //         setSelectionEnabled(!selectionEnabled);
    //       },
    //     })
    //   );
    // }

    itemPromises.push(
      MenuItem.new({
        text: t("tray.settings"),
        // accelerator: "CommandOrControl+,",
        action: () => {
          show_settings();
        },
      }),
    );

    itemPromises.push(
      MenuItem.new({
        text: t("tray.checkUpdate"),
        action: async () => {
          await show_check();
          platformAdapter.emitEvent("check-update");
        },
      }),
    );

    itemPromises.push(PredefinedMenuItem.new({ item: "Separator" }));

    itemPromises.push(
      MenuItem.new({
        text: t("tray.quitCoco"),
        accelerator: "CommandOrControl+Q",
        action: () => {
          exit(0);
        },
      }),
    );

    const items = await Promise.all(itemPromises);
    return Menu.new({ items });
  };

  const updateTrayMenu = async () => {
    info("[Tray] updateTrayMenu called");
    const tray = await getTrayById();

    if (!tray) {
      info("[Tray] updateTrayMenu: tray not found, creating...");
      return createTrayIcon();
    }

    info("[Tray] updateTrayMenu: updating existing tray menu");
    const menu = await getTrayMenu();

    tray.setMenu(menu);
  };
};
