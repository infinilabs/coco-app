import { ArrowDown01, Command, CornerDownLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import Copyright from "../Common/Copyright";
import { isMac } from "@/utils/platform";

interface FooterProps {
  isTauri: boolean;
  openSetting: () => void;
  setWindowAlwaysOnTop: (isPinned: boolean) => Promise<void>;
}

export default function Footer({ isTauri }: FooterProps) {
  const { t } = useTranslation();

  return (
    <div
      data-tauri-drag-region={isTauri}
      className="px-4 z-999 mx-[1px] h-8 absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
      <Copyright />

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
