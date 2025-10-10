import {
  Globe,
  Github,
  Rocket,
  BookOpen,
  MessageCircleReply,
  ScrollText,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { OpenURLWithBrowser } from "@/utils";
import lightLogo from "@/assets/images/logo-text-light.svg";
import darkLogo from "@/assets/images/logo-text-dark.svg";
import { useThemeStore } from "@/stores/themeStore";
import { cloneElement, ReactElement, useMemo } from "react";
import platformAdapter from "@/utils/platformAdapter";

interface Link {
  icon: ReactElement;
  label: string;
  url?: string;
  onPress?: () => void;
}

export default function AboutView() {
  const { t } = useTranslation();
  const { isDark } = useThemeStore();

  const links = useMemo<Link[]>(() => {
    return [
      {
        icon: <Rocket />,
        label: t("settings.about.labels.changelog"),
        url: "https://coco.rs/en/roadmap",
      },
      {
        icon: <BookOpen />,
        label: t("settings.about.labels.docs"),
        url: "https://docs.infinilabs.com/coco-app/main",
      },
      {
        icon: <Github />,
        label: "GitHub",
        url: "https://github.com/infinilabs/coco-app",
      },
      {
        icon: <Globe />,
        label: t("settings.about.labels.officialWebsite"),
        url: "https://coco.rs",
      },
      {
        icon: <MessageCircleReply />,
        label: t("settings.about.labels.submitFeedback"),
        url: "https://github.com/infinilabs/coco-app/issues",
      },
      {
        icon: <ScrollText />,
        label: t("settings.about.labels.runningLog"),
        onPress: platformAdapter.openLogDir,
      },
    ];
  }, [t]);

  const handleClick = (link: Link) => {
    const { url, onPress } = link;

    if (url) {
      return OpenURLWithBrowser(url);
    }

    onPress?.();
  };

  return (
    <div className="flex h-[calc(100vh-170px)]">
      <div className="flex flex-col items-center justify-center w-[70%] pr-10 text-[#999] text-sm">
        <img
          src={isDark ? darkLogo : lightLogo}
          className="h-14"
          alt={t("settings.about.logo")}
        />

        <div className="mt-4 text-base font-medium text-[#333] dark:text-white/80">
          {t("settings.about.slogan")}
        </div>

        <div className="mt-10">
          {t("settings.about.version", {
            version: process.env.VERSION || "N/A",
          })}
        </div>

        <div className="mt-3">
          {t("settings.about.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 pl-10 border-l border-[#e5e5e5] dark:border-[#4e4e56]">
        {links.map((item) => {
          const { icon, label, url, onPress } = item;

          return (
            <div
              key={label}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                {cloneElement(icon, {
                  className: "size-4 text-[#999]",
                })}

                <span
                  className="text-[#333] dark:text-white/80 cursor-pointer hover:text-[#027FFE] transition"
                  onClick={() => {
                    handleClick(item);
                  }}
                >
                  {label}
                </span>
              </div>

              <SquareArrowOutUpRight
                className="text-[#027FFE] size-4 cursor-pointer"
                onClick={() => {
                  handleClick(item);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
