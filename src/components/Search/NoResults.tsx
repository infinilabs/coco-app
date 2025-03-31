import { Command } from "lucide-react";
import { useTranslation } from "react-i18next";

import { isMac } from "@/utils/platform";
import noDataImg from "@/assets/coconut-tree.png";

export const NoResults = () => {
  const { t } = useTranslation();

  return (
    <div
      data-tauri-drag-region
      className="h-full w-full flex flex-col items-center"
    >
      <img src={noDataImg} alt="no-data" className="w-16 h-16 mt-24" />
      <div className="mt-4 text-sm text-[#999] dark:text-[#666]">
        {t("search.main.noResults")}
      </div>
      <div className="mt-10 text-sm  text-[#333] dark:text-[#D8D8D8] flex">
        {t("search.main.askCoco")}
        {isMac ? (
          <span className="ml-3 w-5 h-5 rounded-[6px] border border-[#D8D8D8] flex justify-center items-center">
            <Command className="w-3 h-3" />
          </span>
        ) : (
          <span className="ml-3 w-8 h-5 rounded-[6px] border border-[#D8D8D8] flex justify-center items-center">
            <span className="h-3 leading-3 inline-flex items-center text-xs">
              Ctrl
            </span>
          </span>
        )}
        <span className="ml-1 w-5 h-5 rounded-[6px] border border-[#D8D8D8] flex justify-center items-center">
          T
        </span>
      </div>
    </div>
  );
};
