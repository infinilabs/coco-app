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
import { useEffect } from "react";

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

  // 启动时从后端获取状态 + 监听后端广播，保持实时同步
  useEffect(() => {
    const init = async () => {
      try {
        const enabled = await platformAdapter.invokeBackend<boolean>("get_selection_enabled");
        useSelectionStore.getState().setSelectionEnabled(!!enabled);
        // 初次获取后刷新托盘菜单，确保文案与状态一致
        await updateTrayMenu();
      } catch (e) {
        console.error("get_selection_enabled invoke failed:", e);
      }
    };

    init();

    const unlisten = platformAdapter.listenEvent(
      "selection-enabled",
      async ({ payload }: any) => {
        const enabled = !!payload?.enabled;
        useSelectionStore.getState().setSelectionEnabled(enabled);
        // 收到后端广播后刷新托盘菜单，让文案/对号实时更新
        await updateTrayMenu();
      }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const getTrayMenu = async () => {
    const items = await Promise.all([
      MenuItem.new({
        text: t("tray.showCoco"),
        accelerator: showCocoShortcuts.join("+"),
        action: () => {
          show_coco();
        },
      }),
      PredefinedMenuItem.new({ item: "Separator" }),
      MenuItem.new({
        text: useSelectionStore.getState().selectionEnabled
          ? t("tray.selectionDisable")
          : t("tray.selectionEnable"),
        action: async () => {
          const enabled = useSelectionStore.getState().selectionEnabled;
          try {
            await platformAdapter.invokeBackend("set_selection_enabled", { enabled: !enabled });
            // 依赖后端广播更新 store & 文案，无需前端手动改 store
          } catch (e) {
            console.error("set_selection_enabled invoke failed:", e);
          }
        },
      }),
      MenuItem.new({
        text: t("tray.settings"),
        // accelerator: "CommandOrControl+,",
        action: () => {
          show_settings();
        },
      }),
      MenuItem.new({
        text: t("tray.checkUpdate"),
        action: async () => {
          await show_check();

          platformAdapter.emitEvent("check-update");
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
