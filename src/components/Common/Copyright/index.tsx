import logoLight from "./imgs/logo-light.png";
import logoDark from "./imgs/logo-dark.png";
import { useThemeStore } from "@/stores/themeStore";
import { useAppStore } from "@/stores/appStore";

const Copyright = () => {
  const isDark = useThemeStore((state) => state.isDark);
  const language = useAppStore((state) => state.language);

  const renderLogo = () => {
    return (
      <a href="https://coco.rs/" target="_blank">
        <img src={isDark ? logoDark : logoLight} alt="Logo" className="h-4" />
      </a>
    );
  };

  return (
    <div className="flex items-center gap-[6px] text-xs text-[#666] dark:text-[#999]">
      {language === "en" ? "Powered by" : "由"}
      {renderLogo()}
      {language === "zh" && "提供支持"}
    </div>
  );
};

export default Copyright;
