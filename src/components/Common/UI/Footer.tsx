import { useCallback, useMemo } from "react";
import { ArrowDown01, CornerDownLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import CommonIcon from "@/components/Common/Icons/CommonIcon";
import logoImg from "@/assets/icon.svg";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { useUpdateStore } from "@/stores/updateStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { formatKey } from "@/utils/keyboardUtils";
import source_default_img from "@/assets/images/source_default.png";
import source_default_dark_img from "@/assets/images/source_default_dark.png";
import { useThemeStore } from "@/stores/themeStore";
import platformAdapter from "@/utils/platformAdapter";
import FontIcon from "../Icons/FontIcon";
import TogglePin from "../TogglePin";
import WebFooter from "./WebFooter";

interface FooterProps {
  setIsPinnedWeb?: (value: boolean) => void;
}

export default function Footer({ setIsPinnedWeb }: FooterProps) {
  const { t } = useTranslation();

  const {
    sourceData,
    goAskAi,
    selectedExtension,
    visibleExtensionStore,
    visibleExtensionDetail,
  } = useSearchStore();

  const isDark = useThemeStore((state) => state.isDark);

  const { isTauri } = useAppStore();

  const { setVisible, updateInfo, skipVersions } = useUpdateStore();

  const { modifierKey } = useShortcutsStore();

  const openSetting = useCallback(() => {
    return platformAdapter.emitEvent("open_settings", "");
  }, []);

  const hasUpdate = useMemo(() => {
    return updateInfo && !skipVersions.includes(updateInfo.version);
  }, [updateInfo, skipVersions]);

  const renderTauriLeft = () => {
    if (sourceData?.source?.name) {
      return (
        <div className="flex items-center gap-2">
          <CommonIcon
            item={sourceData}
            renderOrder={["connector_icon", "default_icon"]}
            itemIcon={sourceData?.source?.icon}
            defaultIcon={isDark ? source_default_dark_img : source_default_img}
            className="w-4 h-4"
          />

          <span className="text-sm">{sourceData.source.name}</span>
        </div>
      );
    }

    if (visibleExtensionDetail && selectedExtension) {
      return (
        <div className="flex items-center gap-2">
          <img
            src={selectedExtension.icon}
            className="size-5 dark:drop-shadow-[0_0_6px_rgb(255,255,255)]"
          />
          <span className="text-sm">{selectedExtension.name}</span>
        </div>
      );
    }

    if (visibleExtensionStore) {
      return (
        <div className="flex items-center gap-2">
          <FontIcon name="font_Store" className="size-5" />
          <span className="text-sm">Extension Store</span>
        </div>
      );
    }

    return (
      <>
        <img
          src={logoImg}
          className="w-4 h-4 cursor-pointer"
          onClick={openSetting}
          alt={t("search.footer.logoAlt")}
        />

        <div className="relative text-xs text-gray-500 dark:text-gray-400">
          {hasUpdate ? (
            <div className="cursor-pointer" onClick={() => setVisible(true)}>
              <span>{t("search.footer.updateAvailable")}</span>
              <span className="absolute top-0 -right-2 size-1.5 bg-[#FF3434] rounded-full"></span>
            </div>
          ) : (
            sourceData?.source?.name ||
            t("search.footer.version", {
              version: process.env.VERSION || "N/A",
            })
          )}
        </div>
      </>
    );
  };

  return (
    <div
      data-tauri-drag-region={isTauri}
      className="px-4 z-999 mx-[1px] h-8 absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-md rounded-t-none overflow-hidden"
    >
      {isTauri ? (
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            {renderTauriLeft()}

            <TogglePin
              className={clsx({
                "pl-2": hasUpdate,
              })}
              setIsPinnedWeb={setIsPinnedWeb}
            />
          </div>
        </div>
      ) : (
        <WebFooter />
      )}

      <div className={`flex mobile:hidden items-center gap-3`}>
        <div
          className={clsx(
            "gap-1 flex items-center text-[#666] dark:text-[#666] text-xs",
            {
              hidden:
                (visibleExtensionStore && !selectedExtension) ||
                visibleExtensionDetail ||
                selectedExtension?.installed,
            }
          )}
        >
          <span className="mr-1.5">
            {goAskAi
              ? t("search.askCocoAi.continueInChat")
              : (visibleExtensionStore || visibleExtensionDetail) &&
                !selectedExtension?.installed
              ? t("search.footer.install")
              : t("search.footer.select")}
          </span>
          <kbd className="coco-modal-footer-commands-key pr-1">
            <div className="flex items-center justify-center min-w-3 h-3">
              {formatKey(modifierKey)}
            </div>
          </kbd>
          +
          <kbd className="coco-modal-footer-commands-key pr-1">
            {goAskAi || selectedExtension ? (
              <CornerDownLeft className="w-3 h-3" />
            ) : (
              <ArrowDown01 className="w-3 h-3" />
            )}
          </kbd>
        </div>

        <div
          className={clsx(
            "flex items-center text-[#666] dark:text-[#666] text-xs",
            {
              hidden:
                (visibleExtensionStore && !selectedExtension) ||
                (visibleExtensionDetail && selectedExtension?.installed),
            }
          )}
        >
          <span className="mr-1.5">
            {goAskAi
              ? t("search.askCocoAi.copy")
              : visibleExtensionDetail && !selectedExtension?.installed
              ? t("search.footer.install")
              : visibleExtensionStore
              ? t("search.footer.details")
              : t("search.footer.open")}
          </span>
          <kbd className="coco-modal-footer-commands-key pr-1">
            <CornerDownLeft className="w-3 h-3" />
          </kbd>
        </div>
      </div>
    </div>
  );
}
