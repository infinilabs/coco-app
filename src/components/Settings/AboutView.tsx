import { Globe, Github } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/contexts/ThemeContext";
import { OpenURLWithBrowser } from "@/utils";
import logoLight from "@/assets/images/logo-text-light.svg";
import logoDark from "@/assets/images/logo-text-dark.svg";

export default function AboutView() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const logo = theme === "dark" ? logoDark : logoLight;

  return (
    <div className="flex justify-center items-center flex-col h-[calc(100vh-170px)]">
      <div>
        <img src={logo} className="w-48 dark:text-white" alt={t('settings.about.logo')} />
      </div>
      <div className="mt-8 font-medium text-gray-900 dark:text-gray-100">
        {t('settings.about.slogan')}
      </div>
      <div className="flex justify-center items-center mt-10">
        <button
          onClick={() => OpenURLWithBrowser("https://coco.rs")}
          className="w-6 h-6 mr-2.5 flex justify-center rounded-[6px] border-[1px] gray-200 dark:border-gray-700"
          aria-label={t('settings.about.website')}
        >
          <Globe className="w-3 text-blue-500" />
        </button>
        <button
          onClick={() => OpenURLWithBrowser("https://github.com/infinilabs/coco-app")}
          className="w-6 h-6 flex justify-center rounded-[6px] border-[1px] gray-200 dark:border-gray-700"
          aria-label={t('settings.about.github')}
        >
          <Github className="w-3 text-blue-500" />
        </button>
      </div>
      <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        {t('settings.about.version', { version: '1.0.0' })}
      </div>
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {t('settings.about.copyright', { year: new Date().getFullYear() })}
      </div>
    </div>
  );
}
