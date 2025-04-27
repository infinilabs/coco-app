import { useTranslation } from "react-i18next";

import { isMac } from "@/utils/platform";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import noDataImg from "@/assets/coconut-tree.png";
import clsx from "clsx";
import { formatKey } from "@/utils/keyboardUtils";

export const NoResults = () => {
  const { t } = useTranslation();

  const modifierKey = useShortcutsStore((state) => state.modifierKey);
  const modeSwitch = useShortcutsStore((state) => state.modeSwitch);

  return (
    <div
      data-tauri-drag-region
      className="h-full w-full flex flex-col justify-center items-center"
    >
      <img src={noDataImg} alt="no-data" className="w-16 h-16" />
      <div className="mt-4 text-sm text-[#999] dark:text-[#666]">
        {t("search.main.noResults")}
      </div>
      <div
        className={`flex mobile:hidden mt-10 text-sm  text-[#333] dark:text-[#D8D8D8]`}
      >
        {t("search.main.askCoco")}

        <span
          className={clsx(
            "ml-3 h-5 min-w-5 rounded-md border border-[#D8D8D8] flex justify-center items-center",
            {
              "px-1": !isMac,
            }
          )}
        >
          {formatKey(modifierKey)}
        </span>

        <span className="ml-1 w-5 h-5 rounded-[6px] border border-[#D8D8D8] flex justify-center items-center">
          {modeSwitch}
        </span>
      </div>
    </div>
  );
};
