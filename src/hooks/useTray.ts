import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { TrayIcon, type TrayIconOptions } from "@tauri-apps/api/tray";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { useUpdateEffect } from "ahooks";
import { exit } from "@tauri-apps/plugin-process";

import { isMac } from "@/utils/platform";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { show_coco, show_settings, show_check } from "@/commands";
import { useSelectionStore } from "@/stores/selectionStore";

const TRAY_ID = "COCO_TRAY";

export const useTray = () => {
  const { t, i18n } = useTranslation();
  const trayQueueRef = useRef<(() => Promise<void>)[]>([]);
  const trayRunningRef = useRef(false);
  const showCocoShortcuts = useAppStore((state) => state.showCocoShortcuts);

  const selectionEnabled = useSelectionStore((state) => state.selectionEnabled);
  // const setSelectionEnabled = useSelectionStore((state) => state.setSelectionEnabled);

  useUpdateEffect(() => {
    if (showCocoShortcuts.length === 0) return;

    platformAdapter.info(
      `[Tray] useUpdateEffect triggered, language=${i18n.language}, shortcuts=${showCocoShortcuts}, selectionEnabled=${selectionEnabled}`,
    );

    updateTrayMenu();
  }, [i18n.language, showCocoShortcuts, selectionEnabled]);

  const getTrayById = async () => {
    const tray = await TrayIcon.getById(TRAY_ID);
    platformAdapter.info(`[Tray] getTrayById: ${tray ? "found" : "not found"}`);
    return tray;
  };

  const createTrayIcon = async () => {
    platformAdapter.info("[Tray] createTrayIcon called");

    const tray = await getTrayById();

    if (tray) {
      platformAdapter.info(
        "[Tray] createTrayIcon skipped: tray already exists",
      );
      return tray;
    }

    platformAdapter.info("[Tray] creating new tray icon...");

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
      platformAdapter.info("[Tray] tray icon created successfully");
      return newTray;
    } catch (err) {
      platformAdapter.error(`[Tray] createTrayIcon error: ${err}`);
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

  const runQueue = async () => {
    if (trayRunningRef.current) return;

    trayRunningRef.current = true;

    while (trayQueueRef.current.length > 0) {
      const task = trayQueueRef.current.shift()!;

      try {
        await task();
      } catch (err) {
        platformAdapter.error(`[Tray] task error: ${err}`);
      }
    }

    trayRunningRef.current = false;
  };

  const updateTrayMenu = () => {
    trayQueueRef.current.push(async () => {
      platformAdapter.info("[Tray] updateTrayMenu called");
      const tray = await getTrayById();

      if (!tray) {
        platformAdapter.info(
          "[Tray] updateTrayMenu: tray not found, creating...",
        );
        await createTrayIcon();
        return;
      }

      platformAdapter.info(
        "[Tray] updateTrayMenu: updating existing tray menu",
      );
      const menu = await getTrayMenu();
      tray.setMenu(menu);
    });

    runQueue();
  };
};
