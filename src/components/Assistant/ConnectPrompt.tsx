import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { emit } from "@tauri-apps/api/event";

import LoginDark from "@/assets/images/login-dark.svg";
import LoginLight from "@/assets/images/login-light.svg";
import { useThemeStore } from "@/stores/themeStore";

const ConnectPrompt = () => {
  const { t } = useTranslation();
  const activeTheme = useThemeStore((state) => state.activeTheme);

  const logo = activeTheme === "dark" ? LoginDark : LoginLight;

  const handleConnect = async () => {
    emit("open_settings", "connect");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-sm text-[#333] dark:text-[#d8d8d8]">
      <div className="flex flex-col items-center text-center p-6">
        <img
          src={logo}
          className="w-20 h-20 mb-4"
          alt={t("assistant.chat.logo_alt")}
        />
        <p>{t("assistant.chat.welcome")}</p>
        <p className="mb-4 w-[388px]">{t("assistant.chat.connect_tip")}</p>

        <button
          className="flex items-center gap-2 px-6 py-2 rounded-md text-[#0072ff] transition-colors"
          onClick={handleConnect}
        >
          <span>{t("assistant.chat.connect")}</span>
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  );
};

export default ConnectPrompt;
