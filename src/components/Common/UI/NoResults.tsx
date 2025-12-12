import { useTranslation } from "react-i18next";

import { isMac } from "@/utils/platform";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import clsx from "clsx";
import { formatKey } from "@/utils/keyboardUtils";
import SearchEmpty from "../SearchEmpty";
import FontIcon from "../Icons/FontIcon";
import WebLoginButton from "@/components/WebLogin/LoginButton";
import WebRefreshButton from "@/components/WebLogin/RefreshButton";
import { useWebConfigStore } from "@/stores/webConfigStore";
import { useAppStore } from "@/stores/appStore";

export const NoResults = () => {
  const { t } = useTranslation();

  const modifierKey = useShortcutsStore((state) => state.modifierKey);
  const modeSwitch = useShortcutsStore((state) => state.modeSwitch);

  const { isTauri } = useAppStore();
  const { disabled } = useWebConfigStore();

  const renderContent = () => {
    if (!isTauri && disabled) {
      return (
        <div className="flex flex-col items-center gap-4 text-sm">
          <FontIcon
            name="font_coco-logo-line"
            className="size-20 text-[#999]"
          />

          <div className="text-center">
            <p>{t("webLogin.hints.welcome")}</p>
            <p>{t("webLogin.hints.pleaseLogin")}</p>
          </div>

          <div className="flex gap-2">
            <WebLoginButton />

            <WebRefreshButton />
          </div>
        </div>
      );
    }

    return (
      <>
        <SearchEmpty />

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

          <span className="ml-1 w-5 h-5 rounded-md border border-[#D8D8D8] flex justify-center items-center">
            {modeSwitch}
          </span>
        </div>
      </>
    );
  };

  return (
    <div
      data-tauri-drag-region
      className="h-full w-full flex flex-col justify-center items-center"
    >
      {renderContent()}
    </div>
  );
};
