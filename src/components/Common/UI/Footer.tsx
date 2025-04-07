import { ArrowDown01, Command, CornerDownLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import TypeIcon from "@/components/Common/Icons/TypeIcon";
import Copyright from "@/components/Common/Copyright";
import { isMac } from "@/utils/platform";
import PinOffIcon from "@/icons/PinOff";
import PinIcon from "@/icons/Pin";
import logoImg from "@/assets/icon.svg";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { useUpdateStore } from "@/stores/updateStore";

interface FooterProps {
  isTauri: boolean;
  openSetting: () => void;
  setWindowAlwaysOnTop: (isPinned: boolean) => Promise<void>;
}

export default function Footer({
  isTauri,
  openSetting,
  setWindowAlwaysOnTop,
}: FooterProps) {
  const { t } = useTranslation();
  const sourceData = useSearchStore((state) => state.sourceData);

  const isPinned = useAppStore((state) => state.isPinned);
  const setIsPinned = useAppStore((state) => state.setIsPinned);
  const setVisible = useUpdateStore((state) => state.setVisible);
  const updateInfo = useUpdateStore((state) => state.updateInfo);

  const togglePin = async () => {
    try {
      const newPinned = !isPinned;
      await setWindowAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
      setIsPinned(isPinned);
    }
  };

  return (
    <div
      data-tauri-drag-region={isTauri}
      className="px-4 z-999 mx-[1px] h-8 absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
      {isTauri ? (
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            {sourceData?.source?.name ? (
              <TypeIcon item={sourceData} className="w-4 h-4" />
            ) : (
              <img
                src={logoImg}
                className="w-4 h-4 cursor-pointer"
                onClick={openSetting}
                alt={t("search.footer.logoAlt")}
              />
            )}
            <div className="relative text-xs text-gray-500 dark:text-gray-400">
              {updateInfo?.available ? (
                <div
                  className="cursor-pointer"
                  onClick={() => setVisible(true)}
                >
                  <span>{t("search.footer.updateAvailable")}</span>
                  <span className="absolute top-0 -right-2 size-1.5 bg-[#FF3434] rounded-full"></span>
                </div>
              ) : (
                sourceData?.source?.name ||
                t("search.footer.version", {
                  version: process.env.VERSION || "v1.0.0",
                })
              )}
            </div>

            <button
              onClick={togglePin}
              className={clsx({
                "text-blue-500": isPinned,
                "pl-2": updateInfo?.available,
              })}
            >
              {isPinned ? <PinIcon /> : <PinOffIcon />}
            </button>
          </div>
        </div>
      ) : (
        <Copyright />
      )}

      <div className="flex items-center gap-3">
        <div className="gap-1 flex items-center text-[#666] dark:text-[#666] text-xs">
          <span className="mr-1.5">{t("search.footer.select")}:</span>
          <kbd className="coco-modal-footer-commands-key pr-1">
            {isMac ? (
              <Command className="w-3 h-3" />
            ) : (
              <span className="h-3 leading-3 inline-flex items-center text-xs">
                Ctrl
              </span>
            )}
          </kbd>
          +
          <kbd className="coco-modal-footer-commands-key pr-1">
            <ArrowDown01 className="w-3 h-3" />
          </kbd>
        </div>
        <div className="flex items-center text-[#666] dark:text-[#666] text-xs">
          <span className="mr-1.5">{t("search.footer.open")}: </span>
          <kbd className="coco-modal-footer-commands-key pr-1">
            <CornerDownLeft className="w-3 h-3" />
          </kbd>
        </div>
      </div>
    </div>
  );
}
