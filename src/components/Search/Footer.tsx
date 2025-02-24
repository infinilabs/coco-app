import {
  ArrowDown01,
  Command,
  CornerDownLeft,
  Pin,
  PinOff,
} from "lucide-react";
import { emit } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";

import logoImg from "@/assets/icon.svg";
import { useSearchStore } from "@/stores/searchStore";
import TypeIcon from "@/components/Common/Icons/TypeIcon";
import { useAppStore } from "@/stores/appStore";
import { isMac } from "@/utils/platform";

interface FooterProps {
  isChat: boolean;
  name?: string;
}

export default function Footer({}: FooterProps) {
  const { t } = useTranslation();
  const sourceData = useSearchStore((state) => state.sourceData);

  const isPinned = useAppStore((state) => state.isPinned);
  const setIsPinned = useAppStore((state) => state.setIsPinned);

  function openSetting() {
    emit("open_settings", "");
  }

  const togglePin = async () => {
    try {
      const newPinned = !isPinned;
      await getCurrentWindow().setAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
      setIsPinned(isPinned);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="px-4 z-999 mx-[1px] h-8 absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {sourceData?.source?.name ||
              t("search.footer.version", {
                version: process.env.VERSION || "v1.0.0",
              })}
          </span>
          <button
            onClick={togglePin}
            className={`rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${
              isPinned ? "text-blue-500" : ""
            }`}
          >
            {isPinned ? (
              <Pin className="h-3 w-3" />
            ) : (
              <PinOff className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

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
